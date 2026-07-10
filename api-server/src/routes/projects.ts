import { Router, type IRouter } from "express";
import { eq, or, and, desc, sql } from "drizzle-orm";
import { db, projectsTable, usersTable, milestonesTable, notificationsTable, escrowAccountsTable, disputesTable, activityLogsTable, walletsTable, walletTransactionsTable, taxConfigurationsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { z } from "zod";

const router: IRouter = Router();

function toNum(v: string | null | undefined) {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function serializeProject(p: typeof projectsTable.$inferSelect) {
  return { ...p, budget: Number(p.budget) };
}

const CreateProjectBody = z.object({
  freelancerId: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
  budget: z.number().positive(),
  jobId: z.number().int().positive().optional(),
  deadline: z.string().datetime().optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  milestones: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      percentage: z.number().positive(),
      deliverables: z.string().min(1),
      dueDate: z.string().optional(),
    })
  ).optional(),
});

const CreateMilestoneBody = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().positive(),
  order: z.number().int().optional(),
  dueDate: z.string().datetime().optional(),
});

async function checkAndAutoReleaseMilestones(projectId: number) {
  try {
    const milestones = await db.query.milestonesTable.findMany({
      where: and(eq(milestonesTable.projectId, projectId), eq(milestonesTable.status, "submitted")),
    });

    const project = await db.query.projectsTable.findFirst({
      where: eq(projectsTable.id, projectId),
    });
    if (!project) return;

    const escrow = await db.query.escrowAccountsTable.findFirst({
      where: eq(escrowAccountsTable.projectId, projectId),
    });
    if (!escrow || escrow.status === "disputed" || project.status === "disputed") return;

    const now = Date.now();
    const REVIEW_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days review period

    for (const m of milestones) {
      if (m.submittedAt && now - m.submittedAt.getTime() > REVIEW_PERIOD_MS) {
        // Auto release this milestone!
        const amount = Number(m.amount);
        if (amount <= 0) continue;

        await db.transaction(async (tx) => {
          // Lock wallets
          const allWallets = await tx
            .select()
            .from(walletsTable)
            .where(sql`${walletsTable.userId} IN (${project.clientId}, ${project.freelancerId})`)
            .for("update");

          let clientWallet = allWallets.find((w) => w.userId === project.clientId);
          let freelancerWallet = allWallets.find((w) => w.userId === project.freelancerId);

          if (!clientWallet) {
            clientWallet = (await tx.insert(walletsTable).values({ userId: project.clientId }).returning())[0]!;
          }
          if (!freelancerWallet) {
            freelancerWallet = (await tx.insert(walletsTable).values({ userId: project.freelancerId }).returning())[0]!;
          }

          const clientEscrow = Number(clientWallet.escrowBalance);
          if (clientEscrow < amount) return; // Insufficient escrow balance

          // Update balances
          await tx.update(walletsTable)
            .set({
              escrowBalance: String(clientEscrow - amount),
              totalSpent: String(Number(clientWallet.totalSpent) + amount),
            })
            .where(eq(walletsTable.id, clientWallet.id));

          await tx.update(walletsTable)
            .set({
              availableBalance: String(Number(freelancerWallet.availableBalance) + amount),
              totalEarned: String(Number(freelancerWallet.totalEarned) + amount),
            })
            .where(eq(walletsTable.id, freelancerWallet.id));

          await tx.update(milestonesTable)
            .set({ status: "released", approvedAt: new Date() })
            .where(eq(milestonesTable.id, m.id));

          // Record transactions
          await tx.insert(walletTransactionsTable).values({
            walletId: clientWallet.id,
            type: "escrow_release",
            amount: String(amount),
            description: `Auto-released escrow for milestone "${m.title}" (No review response in 7 days)`,
            referenceId: m.id,
            referenceType: "milestone",
            status: "completed",
          });

          await tx.insert(walletTransactionsTable).values({
            walletId: freelancerWallet.id,
            type: "credit",
            amount: String(amount),
            description: `Payment received (Auto-released) for milestone "${m.title}"`,
            referenceId: m.id,
            referenceType: "milestone",
            status: "completed",
          });

          // Update escrow account
          const newReleased = Number(escrow.releasedAmount) + amount;
          const isPaid = newReleased >= Number(escrow.totalAmount);
          await tx.update(escrowAccountsTable)
            .set({ releasedAmount: String(newReleased), status: isPaid ? "completed" : "funded" })
            .where(eq(escrowAccountsTable.id, escrow.id));

          // Send notifications
          await tx.insert(notificationsTable).values({
            userId: project.freelancerId,
            type: "payment",
            title: "Milestone auto-released",
            body: `Your milestone "${m.title}" payment of $${amount} has been automatically released after 7 days review period.`,
            link: `/wallet`,
          });

          await tx.insert(notificationsTable).values({
            userId: project.clientId,
            type: "payment",
            title: "Milestone auto-released",
            body: `The milestone "${m.title}" payment has been automatically released since the review period has ended.`,
            link: `/projects/${projectId}`,
          });

          // Activity logs
          await tx.insert(activityLogsTable).values({
            projectId,
            userId: project.clientId, // acting client on behalf of system
            action: "milestone_payment_released",
            details: `Auto-released $${amount} for milestone "${m.title}"`,
            entityType: "milestone",
            entityId: m.id,
          });
        });
      }
    }
  } catch (err) {
    console.error("Auto-release failed:", err);
  }
}

router.post("/projects", requireAuth, async (req, res) => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid" }); return; }

  const { freelancerId, title, description, budget, jobId, deadline, commissionRate: projectCommission } = parsed.data;

  const freelancer = await db.query.usersTable.findFirst({ where: eq(usersTable.id, freelancerId) });
  if (!freelancer || freelancer.role !== "freelancer") { res.status(400).json({ error: "Freelancer not found" }); return; }

  // Resolve platform commission rate
  let commissionRate = projectCommission;
  if (commissionRate === undefined) {
    const config = await db.query.taxConfigurationsTable.findFirst({
      orderBy: [desc(taxConfigurationsTable.id)]
    });
    commissionRate = config ? Number(config.platformCommissionRate) : 10;
  }

  // Resolve milestones
  let milestonesList = parsed.data.milestones;
  if (!milestonesList || milestonesList.length === 0) {
    const share = (100 - commissionRate) / 3;
    milestonesList = [
      { title: "Milestone 1", description: "First Phase Milestone", percentage: share, deliverables: "Phase 1 deliverables" },
      { title: "Milestone 2", description: "Second Phase Milestone", percentage: share, deliverables: "Phase 2 deliverables" },
      { title: "Milestone 3", description: "Third Phase Milestone", percentage: share, deliverables: "Phase 3 deliverables" },
    ];
  }

  // VALIDATION: No duplicates
  const titles = milestonesList.map(m => m.title.trim());
  const hasDuplicates = titles.some((val, i) => titles.indexOf(val) !== i);
  if (hasDuplicates) {
    res.status(400).json({ error: "Duplicate milestone names are not allowed" });
    return;
  }

  // VALIDATION: Sum of percentages + platform commission = 100%
  const totalPercentage = milestonesList.reduce((sum, m) => sum + m.percentage, 0);
  const expectedMilestoneSum = 100 - commissionRate;
  if (Math.abs(totalPercentage - expectedMilestoneSum) > 0.01) {
    res.status(400).json({
      error: `Total milestone percentage must equal ${expectedMilestoneSum}% of the project value (got ${totalPercentage.toFixed(2)}% with a ${commissionRate}% platform commission)`
    });
    return;
  }

  let project: any;
  try {
    await db.transaction(async (tx) => {
      // Create Project
      const [createdProj] = await tx.insert(projectsTable).values({
        clientId: req.userId!,
        freelancerId,
        title,
        description,
        budget: String(budget),
        commissionRate: String(commissionRate),
        jobId: jobId ?? null,
        deadline: deadline ? new Date(deadline) : null,
        status: "active",
      }).returning();
      project = createdProj;

      // Insert milestones
      let currentOrder = 1;
      for (const m of milestonesList!) {
        // Amount = Budget * (percentage / 100)
        const amount = budget * (m.percentage / 100);

        // First milestone status should be active (funded), others pending
        // Wait, the project status starts as active. Let's see: milestones status progression rules:
        // "Only one milestone can be active at a time. When Milestone 1 is approved, automatically activate Milestone 2."
        // We will default the first milestone status to "pending" until funded (funded status is set on escrow deposit).
        // Let's set it to pending.
        await tx.insert(milestonesTable).values({
          projectId: project.id,
          title: m.title,
          description: m.description ?? null,
          percentage: String(m.percentage),
          amount: String(amount),
          status: "pending",
          dueDate: m.dueDate ? new Date(m.dueDate) : null,
          deliverables: m.deliverables,
          order: currentOrder++,
        });
      }
    });
  } catch (err: any) {
    console.error("Project creation transaction failed:", err);
    res.status(500).json({ error: err.message || "Failed to create project" });
    return;
  }

  await db.insert(notificationsTable).values({
    userId: freelancerId,
    type: "project_update",
    title: "New project started",
    body: `A new project "${title}" has been created for you.`,
    link: `/projects/${project?.id}`,
  });

  res.status(201).json(project ? serializeProject(project) : null);
});

// POST /projects/validate - Simulates AI payment schedule validation checks
router.post("/projects/validate", requireAuth, async (req, res) => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }); return; }

  const { budget, milestones = [], commissionRate: projectCommission } = parsed.data;

  let commissionRate = projectCommission;
  if (commissionRate === undefined) {
    const config = await db.query.taxConfigurationsTable.findFirst({
      orderBy: [desc(taxConfigurationsTable.id)]
    });
    commissionRate = config ? Number(config.platformCommissionRate) : 10;
  }

  const suggestions: string[] = [];
  const errors: string[] = [];

  if (commissionRate < 0 || commissionRate > 100) {
    errors.push("Platform commission rate must be between 0% and 100%.");
  }

  if (milestones.length > 0) {
    const titles = milestones.map(m => m.title.trim());
    const hasDuplicates = titles.some((val, i) => titles.indexOf(val) !== i);
    if (hasDuplicates) {
      errors.push("Duplicate milestone names are not allowed.");
    }

    const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0);
    const expectedSum = 100 - commissionRate;
    if (Math.abs(totalPercentage - expectedSum) > 0.01) {
      errors.push(`Total milestone percentage must equal ${expectedSum}% of the project value (currently: ${totalPercentage.toFixed(2)}%).`);
    }

    milestones.forEach((m, idx) => {
      if (m.percentage > 70) {
        suggestions.push(`Milestone "${m.title}" represents ${m.percentage}% of the budget. Consider spreading payment structure to decrease client risk.`);
      }
      if (!m.deliverables || m.deliverables.trim().length < 5) {
        suggestions.push(`Milestone "${m.title}" is missing detailed deliverables description.`);
      }
    });

    for (let i = 0; i < milestones.length - 1; i++) {
      const current = milestones[i];
      const next = milestones[i + 1];
      if (current?.dueDate && next?.dueDate && new Date(current.dueDate) > new Date(next.dueDate)) {
        suggestions.push(`Due date conflict: "${current.title}" is scheduled after "${next.title}".`);
      }
    }
  } else {
    suggestions.push("Using default template: 3 milestones sharing budget equally after platform fee.");
  }

  res.json({
    valid: errors.length === 0,
    errors,
    suggestions,
  });
});

router.get("/projects", requireAuth, async (req, res) => {
  const projects = await db.query.projectsTable.findMany({
    where: or(eq(projectsTable.clientId, req.userId!), eq(projectsTable.freelancerId, req.userId!)),
    orderBy: [desc(projectsTable.createdAt)],
  });

  const enriched = await Promise.all(projects.map(async (p) => {
    const [client, freelancer, milestones] = await Promise.all([
      db.query.usersTable.findFirst({ where: eq(usersTable.id, p.clientId) }),
      db.query.usersTable.findFirst({ where: eq(usersTable.id, p.freelancerId) }),
      db.query.milestonesTable.findMany({ where: eq(milestonesTable.projectId, p.id) }),
    ]);
    const total = milestones.reduce((s, m) => s + Number(m.amount), 0);
    const released = milestones.filter(m => m.status === "released").reduce((s, m) => s + Number(m.amount), 0);
    return {
      ...serializeProject(p),
      client: client ? { id: client.id, name: client.name } : null,
      freelancer: freelancer ? { id: freelancer.id, name: freelancer.name, title: freelancer.title } : null,
      milestones: milestones.map(m => ({ ...m, amount: Number(m.amount) })),
      progress: total > 0 ? Math.round((released / total) * 100) : 0,
    };
  }));

  res.json(enriched);
});

router.get("/projects/:id", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await checkAndAutoReleaseMilestones(id);

  const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, id) });
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  if (project.clientId !== req.userId && project.freelancerId !== req.userId) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const [client, freelancer, milestones] = await Promise.all([
    db.query.usersTable.findFirst({ where: eq(usersTable.id, project.clientId) }),
    db.query.usersTable.findFirst({ where: eq(usersTable.id, project.freelancerId) }),
    db.query.milestonesTable.findMany({ where: eq(milestonesTable.projectId, project.id) }),
  ]);

  const total = milestones.reduce((s, m) => s + Number(m.amount), 0);
  const released = milestones.filter(m => m.status === "released").reduce((s, m) => s + Number(m.amount), 0);

  res.json({
    ...serializeProject(project),
    client: client ? { id: client.id, name: client.name } : null,
    freelancer: freelancer ? { id: freelancer.id, name: freelancer.name, title: freelancer.title, avatarUrl: freelancer.avatarUrl } : null,
    milestones: milestones.map(m => ({ ...m, amount: Number(m.amount) })),
    progress: total > 0 ? Math.round((released / total) * 100) : 0,
  });
});

router.patch("/projects/:id/status", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = z.object({ status: z.enum(["active", "completed", "cancelled", "paused"]) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid" }); return; }

  const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, id) });
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  if (project.clientId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const [updated] = await db.update(projectsTable)
    .set({ status: parsed.data.status, completedAt: parsed.data.status === "completed" ? new Date() : undefined })
    .where(eq(projectsTable.id, id))
    .returning();

  res.json(updated ? serializeProject(updated) : null);
});

// Milestone endpoints
router.post("/projects/:id/milestones", requireAuth, async (req, res) => {
  const projectId = parseInt(String(req.params.id));
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }

  const parsed = CreateMilestoneBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid" }); return; }

  const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, projectId) });
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  if (project.clientId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  // Post-funding milestones lock safeguard
  const escrow = await db.query.escrowAccountsTable.findFirst({
    where: eq(escrowAccountsTable.projectId, projectId)
  });
  if (escrow && escrow.status === "funded") {
    res.status(400).json({ error: "Escrow is funded. Milestone changes are locked and require mutual approval or admin mediation." });
    return;
  }

  const { title, description, amount, order, dueDate } = parsed.data;
  const [milestone] = await db.insert(milestonesTable).values({
    projectId,
    title,
    description: description ?? null,
    amount: String(amount),
    order: order ?? 1,
    dueDate: dueDate ? new Date(dueDate) : null,
    status: "pending",
  }).returning();

  res.status(201).json(milestone ? { ...milestone, amount: Number(milestone.amount) } : null);
});

router.patch("/projects/:projectId/milestones/:milestoneId/status", requireAuth, async (req, res) => {
  const projectId = parseInt(String(req.params.projectId));
  const milestoneId = parseInt(String(req.params.milestoneId));
  if (isNaN(projectId) || isNaN(milestoneId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = z.object({
    status: z.enum(["pending", "in_progress", "submitted", "approved", "released"]),
    deliverables: z.string().optional(),
    clientFeedback: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid" }); return; }

  const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, projectId) });
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  if (project.clientId !== req.userId && project.freelancerId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  if (parsed.data.status === "submitted" && project.freelancerId === req.userId) {
    res.status(400).json({ error: "Please use the milestone submission form to upload deliverables." });
    return;
  }

  const updateData: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.status === "submitted") updateData.submittedAt = new Date();
  if (parsed.data.status === "approved" || parsed.data.status === "released") updateData.approvedAt = new Date();
  if (parsed.data.deliverables) updateData.deliverables = parsed.data.deliverables;
  if (parsed.data.clientFeedback) updateData.clientFeedback = parsed.data.clientFeedback;

  const [updated] = await db.update(milestonesTable)
    .set(updateData)
    .where(eq(milestonesTable.id, milestoneId))
    .returning();

  res.json(updated ? { ...updated, amount: Number(updated.amount) } : null);
});

router.patch("/milestones/:milestoneId/status", requireAuth, async (req, res) => {
  const milestoneId = parseInt(String(req.params.milestoneId));
  if (isNaN(milestoneId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = z.object({
    status: z.enum(["pending", "in_progress", "submitted", "approved", "released", "disputed"]),
    deliverables: z.string().optional(),
    clientFeedback: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid" }); return; }

  const milestone = await db.query.milestonesTable.findFirst({ where: eq(milestonesTable.id, milestoneId) });
  if (!milestone) { res.status(404).json({ error: "Milestone not found" }); return; }

  const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, milestone.projectId) });
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  if (project.clientId !== req.userId && project.freelancerId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  if (parsed.data.status === "submitted" && project.freelancerId === req.userId) {
    res.status(400).json({ error: "Please use the milestone submission form to upload deliverables." });
    return;
  }

  const updateData: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.status === "submitted") updateData.submittedAt = new Date();
  if (parsed.data.status === "approved" || parsed.data.status === "released") updateData.approvedAt = new Date();
  if (parsed.data.deliverables) updateData.deliverables = parsed.data.deliverables;
  if (parsed.data.clientFeedback) updateData.clientFeedback = parsed.data.clientFeedback;

  const [updated] = await db.update(milestonesTable)
    .set(updateData)
    .where(eq(milestonesTable.id, milestoneId))
    .returning();

  res.json(updated ? { ...updated, amount: Number(updated.amount) } : null);
});

router.post("/projects/:id/disputes", requireAuth, async (req, res) => {
  const projectId = parseInt(String(req.params.id));
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }

  const parsed = z.object({
    reason: z.string().min(5),
    description: z.string().min(10),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid inputs" }); return; }

  const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, projectId) });
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  if (project.clientId !== req.userId && project.freelancerId !== req.userId) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  // Check for active dispute
  const existing = await db.query.disputesTable.findFirst({
    where: and(eq(disputesTable.projectId, projectId), eq(disputesTable.status, "open")),
  });
  if (existing) { res.status(409).json({ error: "An active dispute already exists for this project" }); return; }

  let createdDispute: any;

  try {
    await db.transaction(async (tx) => {
      // Create dispute record
      const [dispute] = await tx.insert(disputesTable).values({
        projectId,
        raisedBy: req.userId!,
        reason: parsed.data.reason,
        description: parsed.data.description,
        status: "open",
      }).returning();
      createdDispute = dispute;

      // Update project status to disputed
      await tx.update(projectsTable)
        .set({ status: "disputed" })
        .where(eq(projectsTable.id, projectId));

      // Freeze escrow status to disputed
      await tx.update(escrowAccountsTable)
        .set({ status: "disputed" })
        .where(eq(escrowAccountsTable.projectId, projectId));

      // Update milestones status to disputed if they are currently funded/submitted
      await tx.update(milestonesTable)
        .set({ status: "disputed" })
        .where(and(eq(milestonesTable.projectId, projectId), or(eq(milestonesTable.status, "funded"), eq(milestonesTable.status, "in_progress"), eq(milestonesTable.status, "submitted"))));

      // Activity log
      await tx.insert(activityLogsTable).values({
        projectId,
        userId: req.userId!,
        action: "dispute_raised",
        details: `Dispute raised: ${parsed.data.reason}`,
        entityType: "dispute",
        entityId: dispute!.id,
      });

      // Send notifications to other party and admins
      const counterpartyId = req.userId === project.clientId ? project.freelancerId : project.clientId;
      await tx.insert(notificationsTable).values({
        userId: counterpartyId,
        type: "project_update",
        title: "Dispute raised on project",
        body: `The other party has raised a dispute: "${parsed.data.reason}"`,
        link: `/projects/${projectId}`,
      });

      // Notify admin
      const admins = await tx.query.usersTable.findMany({ where: eq(usersTable.role, "admin") });
      for (const admin of admins) {
        await tx.insert(notificationsTable).values({
          userId: admin.id,
          type: "project_update",
          title: "New Dispute Case",
          body: `A dispute has been raised on project "${project.title}"`,
          link: `/admin/disputes`,
        });
      }
    });
  } catch (err: any) {
    console.error("Failed to raise dispute:", err);
    res.status(500).json({ error: "Failed to raise dispute" });
    return;
  }

  res.status(201).json(createdDispute);
});

// GET /platform-config - Public configuration access for clients to view active platform rates
router.get("/platform-config", requireAuth, async (req, res) => {
  try {
    const config = await db.query.taxConfigurationsTable.findFirst({
      orderBy: [desc(taxConfigurationsTable.id)]
    });
    res.json({
      platformCommissionRate: config ? Number(config.platformCommissionRate) : 10,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch platform configuration" });
  }
});

export default router;
