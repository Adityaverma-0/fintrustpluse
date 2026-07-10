import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  db,
  submissionsTable,
  projectsTable,
  milestonesTable,
  notificationsTable,
  activityLogsTable,
  milestoneSubmissionsTable,
  submissionFilesTable,
  submissionCommentsTable,
  walletsTable,
  walletTransactionsTable,
  escrowAccountsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { z } from "zod";
import { broadcastToUser } from "../lib/realtime";
import { generateInvoiceForEvent } from "../lib/invoices";

const router: IRouter = Router();

const CreateSubmissionBody = z.object({
  description: z.string().min(1),
  files: z.string().optional(),
  milestoneId: z.number().int().positive().optional(),
});

router.get("/projects/:id/submissions", requireAuth, async (req, res) => {
  const projectId = parseInt(String(req.params.id));
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, projectId) });
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  if (project.clientId !== req.userId && project.freelancerId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const submissions = await db.query.submissionsTable.findMany({
    where: eq(submissionsTable.projectId, projectId),
    orderBy: [desc(submissionsTable.createdAt)],
  });
  res.json(submissions);
});

router.post("/projects/:id/submissions", requireAuth, async (req, res) => {
  const projectId = parseInt(String(req.params.id));
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = CreateSubmissionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid" }); return; }

  const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, projectId) });
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  if (project.status !== "active") {
    res.status(403).json({ error: `Project is not active (status: ${project.status}). Escrow must be funded first.` });
    return;
  }
  if (project.freelancerId !== req.userId) { res.status(403).json({ error: "Only the freelancer can submit deliverables" }); return; }

  // Get version count for this milestone/project
  const existing = await db.query.submissionsTable.findMany({
    where: and(
      eq(submissionsTable.projectId, projectId),
      parsed.data.milestoneId ? eq(submissionsTable.milestoneId, parsed.data.milestoneId) : eq(submissionsTable.projectId, projectId)
    ),
  });

  const [submission] = await db.insert(submissionsTable).values({
    projectId,
    milestoneId: parsed.data.milestoneId ?? null,
    freelancerId: req.userId!,
    description: parsed.data.description,
    files: parsed.data.files ?? null,
    version: existing.length + 1,
    status: "submitted",
  }).returning();

  // Mark milestone as submitted if milestoneId provided
  if (parsed.data.milestoneId) {
    await db.update(milestonesTable)
      .set({ status: "submitted", submittedAt: new Date(), deliverables: parsed.data.description })
      .where(eq(milestonesTable.id, parsed.data.milestoneId));
  }

  await db.insert(notificationsTable).values({
    userId: project.clientId,
    type: "submission",
    title: "New deliverable submitted",
    body: `The freelancer submitted work for project "${project.title}". Please review.`,
    link: `/projects/${projectId}`,
  });

  await db.insert(activityLogsTable).values({
    projectId,
    userId: req.userId!,
    action: "deliverable_submitted",
    details: `Deliverable v${existing.length + 1} submitted`,
    entityType: "submission",
    entityId: submission?.id,
  });

  res.status(201).json(submission);
});

router.patch("/projects/:projectId/submissions/:submissionId/review", requireAuth, async (req, res) => {
  const projectId = parseInt(String(req.params.projectId));
  const submissionId = parseInt(String(req.params.submissionId));
  if (isNaN(projectId) || isNaN(submissionId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = z.object({
    status: z.enum(["approved", "rejected"]),
    clientFeedback: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid" }); return; }

  const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, projectId) });
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  if (project.clientId !== req.userId) { res.status(403).json({ error: "Only the client can review submissions" }); return; }

  const [updated] = await db.update(submissionsTable)
    .set({ status: parsed.data.status, clientFeedback: parsed.data.clientFeedback ?? null, reviewedAt: new Date() })
    .where(eq(submissionsTable.id, submissionId))
    .returning();

  await db.insert(activityLogsTable).values({
    projectId,
    userId: req.userId!,
    action: `submission_${parsed.data.status}`,
    details: parsed.data.clientFeedback ?? `Submission ${parsed.data.status}`,
    entityType: "submission",
    entityId: submissionId,
  });

  await db.insert(notificationsTable).values({
    userId: project.freelancerId,
    type: "submission",
    title: `Submission ${parsed.data.status}`,
    body: parsed.data.clientFeedback ?? `Your submission was ${parsed.data.status}.`,
    link: `/projects/${projectId}`,
  });

  res.json(updated);
});

router.get("/projects/:projectId/milestone-submissions", requireAuth, async (req, res) => {
  const projectId = parseInt(String(req.params.projectId));
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }

  try {
    const submissions = await db.query.milestoneSubmissionsTable.findMany({
      where: eq(milestoneSubmissionsTable.projectId, projectId),
      orderBy: [desc(milestoneSubmissionsTable.createdAt)],
    });

    const fullSubmissions = await Promise.all(submissions.map(async (s) => {
      const files = await db.query.submissionFilesTable.findMany({
        where: eq(submissionFilesTable.submissionId, s.id),
      });
      const comments = await db.query.submissionCommentsTable.findMany({
        where: eq(submissionCommentsTable.submissionId, s.id),
        orderBy: [desc(submissionCommentsTable.createdAt)],
      });
      return { ...s, files, comments };
    }));

    res.json(fullSubmissions);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to fetch submissions" });
  }
});

router.post("/projects/:projectId/milestones/:milestoneId/submit", requireAuth, async (req, res) => {
  const projectId = parseInt(String(req.params.projectId));
  const milestoneId = parseInt(String(req.params.milestoneId));
  if (isNaN(projectId) || isNaN(milestoneId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const parsed = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    workSummary: z.string().optional(),
    completionNotes: z.string().optional(),
    technologiesUsed: z.string().optional(),
    timeSpent: z.number().int().optional(),
    projectVersion: z.string().default("1.0.0"),
    githubRepo: z.string().optional(),
    liveDemoUrl: z.string().optional(),
    figmaLink: z.string().optional(),
    files: z.array(z.object({
      filename: z.string(),
      fileType: z.string(),
      fileSize: z.number(),
      fileUrl: z.string(),
      fileHash: z.string().optional(),
    })).default([]),
  }).safeParse(req.body);

  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid" }); return; }

  try {
    const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, projectId) });
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }
    if (project.freelancerId !== req.userId) { res.status(403).json({ error: "Only the assigned freelancer can submit milestones" }); return; }
    if (project.status !== "active") { res.status(403).json({ error: "Project escrow must be funded before work can be submitted" }); return; }

    const milestone = await db.query.milestonesTable.findFirst({ where: eq(milestonesTable.id, milestoneId) });
    if (!milestone || milestone.projectId !== projectId) { res.status(404).json({ error: "Milestone not found" }); return; }
    if (!["funded", "in_progress", "rejected"].includes(milestone.status)) {
      res.status(400).json({ error: "This milestone is locked and cannot be submitted. You must complete the previous active milestone first." });
      return;
    }

    const submission = await db.transaction(async (tx) => {
      // Create milestone submission
      const [sub] = await tx.insert(milestoneSubmissionsTable).values({
        projectId,
        milestoneId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        workSummary: parsed.data.workSummary ?? null,
        completionNotes: parsed.data.completionNotes ?? null,
        technologiesUsed: parsed.data.technologiesUsed ?? null,
        timeSpent: parsed.data.timeSpent ?? null,
        projectVersion: parsed.data.projectVersion,
        githubRepo: parsed.data.githubRepo ?? null,
        liveDemoUrl: parsed.data.liveDemoUrl ?? null,
        figmaLink: parsed.data.figmaLink ?? null,
        status: "submitted",
      }).returning();

      // Create files if any
      if (parsed.data.files.length > 0) {
        for (const f of parsed.data.files) {
          await tx.insert(submissionFilesTable).values({
            submissionId: sub.id,
            filename: f.filename,
            fileType: f.fileType,
            fileSize: f.fileSize,
            fileUrl: f.fileUrl,
            fileHash: f.fileHash ?? null,
          });
        }
      }

      // Update milestone status
      await tx.update(milestonesTable)
        .set({ status: "submitted", submittedAt: new Date(), deliverables: parsed.data.workSummary || parsed.data.description || parsed.data.title })
        .where(eq(milestonesTable.id, milestoneId));

      // Create activity logs
      await tx.insert(activityLogsTable).values({
        projectId,
        userId: req.userId!,
        action: "milestone_submitted",
        details: `Milestone "${milestone.title}" submitted (Submission v${parsed.data.projectVersion})`,
      });

      // Send notifications
      await tx.insert(notificationsTable).values({
        userId: project.clientId,
        type: "submission",
        title: "Milestone submitted for review",
        body: `Freelancer submitted work for milestone "${milestone.title}" in project "${project.title}".`,
        link: `/projects/${projectId}`,
      });

      return { ...sub, files: parsed.data.files };
    });

    // Realtime websocket notifications
    broadcastToUser(project.clientId, "milestone_submitted", { projectId, milestoneId });
    broadcastToUser(project.freelancerId, "milestone_submitted", { projectId, milestoneId });

    res.status(201).json(submission);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to submit milestone" });
  }
});

router.get("/milestones/:id/submissions", requireAuth, async (req, res) => {
  const milestoneId = parseInt(String(req.params.id));
  if (isNaN(milestoneId)) { res.status(400).json({ error: "Invalid milestone id" }); return; }

  try {
    const submissions = await db.query.milestoneSubmissionsTable.findMany({
      where: eq(milestoneSubmissionsTable.milestoneId, milestoneId),
      orderBy: [desc(milestoneSubmissionsTable.createdAt)],
    });

    const fullSubmissions = await Promise.all(submissions.map(async (s) => {
      const files = await db.query.submissionFilesTable.findMany({
        where: eq(submissionFilesTable.submissionId, s.id),
      });
      const comments = await db.query.submissionCommentsTable.findMany({
        where: eq(submissionCommentsTable.submissionId, s.id),
        orderBy: [desc(submissionCommentsTable.createdAt)],
      });
      return { ...s, files, comments };
    }));

    res.json(fullSubmissions);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to fetch submissions" });
  }
});

router.get("/submission/:id", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid submission id" }); return; }

  try {
    const submission = await db.query.milestoneSubmissionsTable.findFirst({
      where: eq(milestoneSubmissionsTable.id, id),
    });
    if (!submission) { res.status(404).json({ error: "Submission not found" }); return; }

    const files = await db.query.submissionFilesTable.findMany({
      where: eq(submissionFilesTable.submissionId, id),
    });
    const comments = await db.query.submissionCommentsTable.findMany({
      where: eq(submissionCommentsTable.submissionId, id),
    });

    res.json({ ...submission, files, comments });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to fetch submission" });
  }
});

router.patch("/submission/:id", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid submission id" }); return; }

  const parsed = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    workSummary: z.string().optional(),
    completionNotes: z.string().optional(),
  }).safeParse(req.body);

  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid" }); return; }

  try {
    const [updated] = await db.update(milestoneSubmissionsTable)
      .set(parsed.data)
      .where(eq(milestoneSubmissionsTable.id, id))
      .returning();

    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to update submission" });
  }
});

router.post("/submission/:id/revision", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = z.object({
    comment: z.string().min(1),
  }).safeParse(req.body);

  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Comment required" }); return; }

  try {
    const sub = await db.query.milestoneSubmissionsTable.findFirst({ where: eq(milestoneSubmissionsTable.id, id) });
    if (!sub) { res.status(404).json({ error: "Submission not found" }); return; }

    const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, sub.projectId) });
    if (!project || project.clientId !== req.userId) { res.status(403).json({ error: "Only the client can request revisions" }); return; }

    await db.transaction(async (tx) => {
      // Update submission status
      await tx.update(milestoneSubmissionsTable)
        .set({ status: "revision_requested", revisionNotes: parsed.data.comment })
        .where(eq(milestoneSubmissionsTable.id, id));

      // Update milestone status to rejected (Revision Needed)
      await tx.update(milestonesTable)
        .set({ status: "rejected", clientFeedback: parsed.data.comment })
        .where(eq(milestonesTable.id, sub.milestoneId));

      // Log comment
      await tx.insert(submissionCommentsTable).values({
        submissionId: id,
        userId: req.userId!,
        comment: `Revision Requested: ${parsed.data.comment}`,
      });

      // Log activity
      await tx.insert(activityLogsTable).values({
        projectId: project.id,
        userId: req.userId!,
        action: "revision_requested",
        details: `Revision requested on milestone submission`,
      });

      // Notify freelancer
      await tx.insert(notificationsTable).values({
        userId: project.freelancerId,
        type: "submission",
        title: "Revision requested",
        body: `Client requested a revision on project "${project.title}".`,
        link: `/projects/${project.id}`,
      });
    });

    // Realtime websocket notifications
    broadcastToUser(project.clientId, "milestone_submitted", { projectId: project.id, milestoneId: sub.milestoneId });
    broadcastToUser(project.freelancerId, "milestone_submitted", { projectId: project.id, milestoneId: sub.milestoneId });

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to request revision" });
  }
});

router.post("/submission/:id/approve", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  let clientTxRecord: any;
  let releaseAmount = 0;
  let escrowRecord: any;

  const parsed = z.object({
    comment: z.string().optional(),
    rating: z.number().int().min(1).max(5).optional(),
  }).safeParse(req.body);

  try {
    const sub = await db.query.milestoneSubmissionsTable.findFirst({ where: eq(milestoneSubmissionsTable.id, id) });
    if (!sub) { res.status(404).json({ error: "Submission not found" }); return; }

    const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, sub.projectId) });
    if (!project || project.clientId !== req.userId) { res.status(403).json({ error: "Only the client can approve submissions" }); return; }

    const milestone = await db.query.milestonesTable.findFirst({ where: eq(milestonesTable.id, sub.milestoneId) });
    if (!milestone) { res.status(404).json({ error: "Milestone not found" }); return; }

    await db.transaction(async (tx) => {
      // Update submission status to approved and store rating if provided
      await tx.update(milestoneSubmissionsTable)
        .set({ status: "approved", rating: parsed.data?.rating ?? null })
        .where(eq(milestoneSubmissionsTable.id, id));

      // Update milestone status to approved
      await tx.update(milestonesTable)
        .set({ status: "approved", approvedAt: new Date() })
        .where(eq(milestonesTable.id, sub.milestoneId));

      if (parsed.data?.comment) {
        await tx.insert(submissionCommentsTable).values({
          submissionId: id,
          userId: req.userId!,
          comment: parsed.data.comment,
          rating: parsed.data.rating ?? null,
        });
      }

      // AUTOMATIC PAYMENT RELEASE ROUTINE
      const escrow = await tx.query.escrowAccountsTable.findFirst({
        where: eq(escrowAccountsTable.projectId, project.id),
      });

      if (escrow && Number(escrow.totalAmount) > 0) {
        const clientWallet = await tx.query.walletsTable.findFirst({
          where: eq(walletsTable.userId, project.clientId),
        });
        const freelancerWallet = await tx.query.walletsTable.findFirst({
          where: eq(walletsTable.userId, project.freelancerId),
        });

        if (clientWallet && freelancerWallet) {
          releaseAmount = Number(milestone.amount);

          const projectBudget = Number(project.budget);
          const commRate = Number(project.commissionRate);
          const platformCommissionVal = projectBudget * (commRate / 100);

          const allMilestones = await tx.query.milestonesTable.findMany({
            where: eq(milestonesTable.projectId, project.id),
            orderBy: [sql`"order" ASC`]
          });
          const currentIdx = allMilestones.findIndex(m => m.id === milestone.id);
          const isFinalMilestone = currentIdx === allMilestones.length - 1;

          // Adjust client escrow balances (also deduct platform commission on final milestone release)
          let newClientEscrow = Number(clientWallet.escrowBalance) - releaseAmount;
          if (isFinalMilestone) {
            newClientEscrow -= platformCommissionVal;
          }
          const newFreelancerAvailable = Number(freelancerWallet.availableBalance) + releaseAmount;
          const newFreelancerEarned = Number(freelancerWallet.totalEarned) + releaseAmount;

          await tx.update(walletsTable)
            .set({
              escrowBalance: String(Math.max(0, newClientEscrow)),
              totalSpent: String(Number(clientWallet.totalSpent) + releaseAmount + (isFinalMilestone ? platformCommissionVal : 0)),
            })
            .where(eq(walletsTable.id, clientWallet.id));

          await tx.update(walletsTable)
            .set({
              availableBalance: String(newFreelancerAvailable),
              totalEarned: String(newFreelancerEarned),
            })
            .where(eq(walletsTable.id, freelancerWallet.id));

          // Record transaction ledger logs for both parties
          const [insertedClientTx] = await tx.insert(walletTransactionsTable).values({
            walletId: clientWallet.id,
            type: "escrow_release",
            amount: String(releaseAmount),
            description: `Escrow payment released for milestone "${milestone.title}" in project "${project.title}"`,
            referenceId: milestone.id,
            referenceType: "milestone",
            status: "completed",
          }).returning();
          clientTxRecord = insertedClientTx;

          await tx.insert(walletTransactionsTable).values({
            walletId: freelancerWallet.id,
            type: "credit",
            amount: String(releaseAmount),
            description: `Payment received for milestone "${milestone.title}" in project "${project.title}"`,
            referenceId: milestone.id,
            referenceType: "milestone",
            status: "completed",
          });

          // Set milestone status to released
          await tx.update(milestonesTable)
            .set({ status: "released" })
            .where(eq(milestonesTable.id, milestone.id));

          // Set submission status to released
          await tx.update(milestoneSubmissionsTable)
            .set({ status: "released" })
            .where(eq(milestoneSubmissionsTable.id, id));

          // Adjust escrow account balances
          escrowRecord = escrow;
          const newEscrowReleased = Number(escrow.releasedAmount) + releaseAmount + (isFinalMilestone ? platformCommissionVal : 0);
          const isPaid = newEscrowReleased >= Number(escrow.totalAmount);
          await tx.update(escrowAccountsTable)
            .set({ releasedAmount: String(newEscrowReleased), status: isPaid ? "completed" : "funded" })
            .where(eq(escrowAccountsTable.id, escrow.id));

          if (isFinalMilestone) {
            // Automatically complete the project when final milestone is approved & released
            await tx.update(projectsTable)
              .set({ status: "completed", completedAt: new Date() })
              .where(eq(projectsTable.id, project.id));
          } else if (currentIdx !== -1 && currentIdx < allMilestones.length - 1) {
            // Activate sequential next milestone
            const nextMilestone = allMilestones[currentIdx + 1];
            await tx.update(milestonesTable)
              .set({ status: "funded" })
              .where(eq(milestonesTable.id, nextMilestone.id));
            
            await tx.insert(notificationsTable).values({
              userId: project.freelancerId,
              type: "project_update",
              title: "Next Milestone Activated",
              body: `Milestone "${nextMilestone.title}" is now active and ready for work.`,
              link: `/projects/${project.id}`,
            });
          }

          // ESCROW CALCULATION ENGINE VALIDATION
          const currentEscrow = await tx.query.escrowAccountsTable.findFirst({
            where: eq(escrowAccountsTable.projectId, project.id)
          });

          if (currentEscrow) {
            const releasedAmt = Number(currentEscrow.releasedAmount);
            const totalAmt = Number(currentEscrow.totalAmount);
            const lockedEscrow = totalAmt - platformCommissionVal - releasedAmt;

            const calculatedSum = platformCommissionVal + lockedEscrow + releasedAmt;
            if (Math.abs(projectBudget - calculatedSum) > 0.01) {
              throw new Error(`Escrow balance validation failed: Budget mismatch. Project Budget ($${projectBudget}) != Calculated Sum ($${calculatedSum.toFixed(2)})`);
            }
          }
        }
      }

      // Log activity
      await tx.insert(activityLogsTable).values({
        projectId: project.id,
        userId: req.userId!,
        action: "milestone_approved",
        details: `Milestone "${milestone.title}" approved and funds released`,
      });

      // Notify freelancer
      await tx.insert(notificationsTable).values({
        userId: project.freelancerId,
        type: "submission",
        title: "Milestone Approved & Released",
        body: `Client approved work and released payment for milestone "${milestone.title}".`,
        link: `/projects/${project.id}`,
      });
    });

    try {
      if (releaseAmount > 0) {
        await generateInvoiceForEvent("milestone_release", releaseAmount, project.clientId, project.freelancerId, {
          projectId: project.id,
          milestoneId: milestone.id,
          transactionId: clientTxRecord?.id,
          escrowAccountId: escrowRecord?.id,
        });
      }
    } catch (invErr) {
      console.error("Milestone release invoice generation failed on approve:", invErr);
    }

    // Realtime websocket notifications
    broadcastToUser(project.clientId, "milestone_submitted", { projectId: project.id, milestoneId: sub.milestoneId });
    broadcastToUser(project.freelancerId, "milestone_submitted", { projectId: project.id, milestoneId: sub.milestoneId });
    broadcastToUser(project.freelancerId, "dashboard_update", {});
    broadcastToUser(project.clientId, "dashboard_update", {});

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to approve submission" });
  }
});

router.post("/submission/:id/reject", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = z.object({
    comment: z.string().min(1),
  }).safeParse(req.body);

  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Comment required" }); return; }

  try {
    const sub = await db.query.milestoneSubmissionsTable.findFirst({ where: eq(milestoneSubmissionsTable.id, id) });
    if (!sub) { res.status(404).json({ error: "Submission not found" }); return; }

    const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, sub.projectId) });
    if (!project || project.clientId !== req.userId) { res.status(403).json({ error: "Only the client can reject submissions" }); return; }

    await db.transaction(async (tx) => {
      // Update submission status
      await tx.update(milestoneSubmissionsTable)
        .set({ status: "rejected" })
        .where(eq(milestoneSubmissionsTable.id, id));

      // Update milestone status
      await tx.update(milestonesTable)
        .set({ status: "rejected", clientFeedback: parsed.data.comment })
        .where(eq(milestonesTable.id, sub.milestoneId));

      // Log comment
      await tx.insert(submissionCommentsTable).values({
        submissionId: id,
        userId: req.userId!,
        comment: `Rejected: ${parsed.data.comment}`,
      });

      // Log activity
      await tx.insert(activityLogsTable).values({
        projectId: project.id,
        userId: req.userId!,
        action: "milestone_rejected",
        details: `Milestone submission rejected`,
      });

      // Notify freelancer
      await tx.insert(notificationsTable).values({
        userId: project.freelancerId,
        type: "submission",
        title: "Milestone rejected",
        body: `Client rejected work for project "${project.title}".`,
        link: `/projects/${project.id}`,
      });
    });

    // Realtime websocket notifications
    broadcastToUser(project.clientId, "milestone_submitted", { projectId: project.id, milestoneId: sub.milestoneId });
    broadcastToUser(project.freelancerId, "milestone_submitted", { projectId: project.id, milestoneId: sub.milestoneId });

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to reject submission" });
  }
});

router.post("/submission/:id/comment", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = z.object({
    comment: z.string().min(1),
    rating: z.number().int().min(1).max(5).optional(),
  }).safeParse(req.body);

  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Comment is required" }); return; }

  try {
    const sub = await db.query.milestoneSubmissionsTable.findFirst({ where: eq(milestoneSubmissionsTable.id, id) });
    if (!sub) { res.status(404).json({ error: "Submission not found" }); return; }

    const [newComment] = await db.insert(submissionCommentsTable).values({
      submissionId: id,
      userId: req.userId!,
      comment: parsed.data.comment,
      rating: parsed.data.rating ?? null,
    }).returning();

    res.status(201).json(newComment);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to post comment" });
  }
});

export default router;
