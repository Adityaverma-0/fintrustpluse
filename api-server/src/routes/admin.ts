import { Router, type IRouter } from "express";
import { eq, count, desc, sql, and, or } from "drizzle-orm";
import { db, usersTable, jobsTable, projectsTable, proposalsTable, reviewsTable, walletsTable, disputesTable, escrowAccountsTable, walletTransactionsTable, activityLogsTable, milestonesTable, notificationsTable, taxConfigurationsTable, featuredJobsTable, adminAuditLogsTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import { hashPassword } from "../lib/auth";
import { broadcastToAll } from "../lib/realtime";

const router: IRouter = Router();

async function requireAdmin(req: any, res: any): Promise<boolean> {
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.userId!) });
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

router.get("/admin/stats", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const [
    totalUsers,
    totalJobs,
    totalProjects,
    activeProjects,
    completedProjects,
    totalProposals,
    totalDisputes,
  ] = await Promise.all([
    db.select({ count: count() }).from(usersTable),
    db.select({ count: count() }).from(jobsTable),
    db.select({ count: count() }).from(projectsTable),
    db.select({ count: count() }).from(projectsTable).where(eq(projectsTable.status, "active")),
    db.select({ count: count() }).from(projectsTable).where(eq(projectsTable.status, "completed")),
    db.select({ count: count() }).from(proposalsTable),
    db.select({ count: count() }).from(disputesTable),
  ]);

  const walletSums = await db.select({
    totalEscrow: sql<string>`SUM(escrow_balance)`,
    totalAvailable: sql<string>`SUM(available_balance)`,
    totalEarned: sql<string>`SUM(total_earned)`,
  }).from(walletsTable);

  const freelancers = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "freelancer"));
  const clients = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "client"));

  res.json({
    users: {
      total: totalUsers[0]?.count ?? 0,
      freelancers: freelancers[0]?.count ?? 0,
      clients: clients[0]?.count ?? 0,
    },
    jobs: { total: totalJobs[0]?.count ?? 0 },
    projects: {
      total: totalProjects[0]?.count ?? 0,
      active: activeProjects[0]?.count ?? 0,
      completed: completedProjects[0]?.count ?? 0,
    },
    proposals: { total: totalProposals[0]?.count ?? 0 },
    disputes: { total: totalDisputes[0]?.count ?? 0 },
    escrow: {
      totalLocked: Number(walletSums[0]?.totalEscrow ?? 0),
      totalAvailable: Number(walletSums[0]?.totalAvailable ?? 0),
      totalEarned: Number(walletSums[0]?.totalEarned ?? 0),
    },
  });
});

router.get("/admin/users", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const users = await db.query.usersTable.findMany({
    orderBy: [desc(usersTable.createdAt)],
  });

  res.json(users.map(u => {
    const { passwordHash: _ph, ...safe } = u;
    return {
      ...safe,
      hourlyRate: u.hourlyRate ? Number(u.hourlyRate) : null,
      trustScore: u.trustScore ? Number(u.trustScore) : null,
      totalEarned: u.totalEarned ? Number(u.totalEarned) : null,
      totalSpent: u.totalSpent ? Number(u.totalSpent) : null,
      completionRate: u.completionRate ? Number(u.completionRate) : null,
    };
  }));
});

router.get("/admin/disputes", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const disputes = await db.query.disputesTable.findMany({
    orderBy: [desc(disputesTable.createdAt)],
  });

  const enriched = await Promise.all(disputes.map(async (d) => {
    const [project, raisedBy] = await Promise.all([
      db.query.projectsTable.findFirst({ where: eq(projectsTable.id, d.projectId) }),
      db.query.usersTable.findFirst({ where: eq(usersTable.id, d.raisedBy) }),
    ]);
    return {
      ...d,
      project: project ? { id: project.id, title: project.title } : null,
      raisedByUser: raisedBy ? { id: raisedBy.id, name: raisedBy.name, role: raisedBy.role } : null,
    };
  }));

  res.json(enriched);
});

router.post("/admin/disputes/:disputeId/resolve", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const disputeId = parseInt(String(req.params.disputeId));
  if (isNaN(disputeId)) { res.status(400).json({ error: "Invalid dispute id" }); return; }

  const parsed = z.object({
    action: z.enum(["release", "refund", "split", "extend"]),
    freelancerShare: z.number().nonnegative().optional(),
    clientShare: z.number().nonnegative().optional(),
    newDeadline: z.string().datetime().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }); return; }

  const { action, freelancerShare = 0, clientShare = 0, newDeadline } = parsed.data;

  const dispute = await db.query.disputesTable.findFirst({ where: eq(disputesTable.id, disputeId) });
  if (!dispute) { res.status(404).json({ error: "Dispute case not found" }); return; }
  if (dispute.status === "resolved") { res.status(400).json({ error: "Dispute is already resolved" }); return; }

  const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, dispute.projectId) });
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const escrow = await db.query.escrowAccountsTable.findFirst({ where: eq(escrowAccountsTable.projectId, project.id) });
  if (!escrow) { res.status(404).json({ error: "Escrow account not found" }); return; }

  const remaining = Number(escrow.totalAmount) - Number(escrow.releasedAmount) - Number(escrow.refundedAmount);

  try {
    await db.transaction(async (tx) => {
      const [clientWallet] = await tx.select().from(walletsTable).where(eq(walletsTable.userId, project.clientId)).for("update");
      const [freelancerWallet] = await tx.select().from(walletsTable).where(eq(walletsTable.userId, project.freelancerId)).for("update");

      const cWallet = clientWallet || (await tx.insert(walletsTable).values({ userId: project.clientId }).returning())[0]!;
      const fWallet = freelancerWallet || (await tx.insert(walletsTable).values({ userId: project.freelancerId }).returning())[0]!;

      if (action === "release") {
        if (remaining <= 0) throw new Error("No remaining funds in escrow to release");

        // client escrow -> freelancer available
        await tx.update(walletsTable)
          .set({
            escrowBalance: String(Number(cWallet.escrowBalance) - remaining),
            totalSpent: String(Number(cWallet.totalSpent) + remaining),
          })
          .where(eq(walletsTable.id, cWallet.id));

        await tx.update(walletsTable)
          .set({
            availableBalance: String(Number(fWallet.availableBalance) + remaining),
            totalEarned: String(Number(fWallet.totalEarned) + remaining),
          })
          .where(eq(walletsTable.id, fWallet.id));

        await tx.update(escrowAccountsTable)
          .set({ releasedAmount: String(Number(escrow.releasedAmount) + remaining), status: "completed" })
          .where(eq(escrowAccountsTable.id, escrow.id));

        await tx.update(projectsTable).set({ status: "completed", completedAt: new Date() }).where(eq(projectsTable.id, project.id));
        await tx.update(milestonesTable).set({ status: "released" }).where(and(eq(milestonesTable.projectId, project.id), eq(milestonesTable.status, "disputed")));

        // Record ledger transactions
        await tx.insert(walletTransactionsTable).values({
          walletId: cWallet.id,
          type: "escrow_release",
          amount: String(remaining),
          description: `Dispute resolved: Released escrow balance to freelancer`,
          referenceId: disputeId,
          referenceType: "dispute",
          status: "completed",
        });

        await tx.insert(walletTransactionsTable).values({
          walletId: fWallet.id,
          type: "credit",
          amount: String(remaining),
          description: `Dispute resolved: Received escrow release`,
          referenceId: disputeId,
          referenceType: "dispute",
          status: "completed",
        });

      } else if (action === "refund") {
        if (remaining <= 0) throw new Error("No remaining funds in escrow to refund");

        // client escrow -> client available
        await tx.update(walletsTable)
          .set({
            escrowBalance: String(Number(cWallet.escrowBalance) - remaining),
            availableBalance: String(Number(cWallet.availableBalance) + remaining),
          })
          .where(eq(walletsTable.id, cWallet.id));

        await tx.update(escrowAccountsTable)
          .set({ refundedAmount: String(Number(escrow.refundedAmount) + remaining), status: "completed" })
          .where(eq(escrowAccountsTable.id, escrow.id));

        await tx.update(projectsTable).set({ status: "cancelled" }).where(eq(projectsTable.id, project.id));
        await tx.update(milestonesTable).set({ status: "pending" }).where(and(eq(milestonesTable.projectId, project.id), eq(milestonesTable.status, "disputed")));

        // Record ledger transaction
        await tx.insert(walletTransactionsTable).values({
          walletId: cWallet.id,
          type: "refund",
          amount: String(remaining),
          description: `Dispute resolved: Escrow balance refunded to client`,
          referenceId: disputeId,
          referenceType: "dispute",
          status: "completed",
        });

      } else if (action === "split") {
        if (remaining <= 0) throw new Error("No remaining funds in escrow to split");
        if (Math.abs(freelancerShare + clientShare - remaining) > 0.01) {
          throw new Error(`Split sum ($${freelancerShare + clientShare}) must equal remaining escrow ($${remaining})`);
        }

        // client escrow -> freelancer available & client available
        await tx.update(walletsTable)
          .set({
            escrowBalance: String(Number(cWallet.escrowBalance) - remaining),
            availableBalance: String(Number(cWallet.availableBalance) + clientShare),
            totalSpent: String(Number(cWallet.totalSpent) + freelancerShare),
          })
          .where(eq(walletsTable.id, cWallet.id));

        await tx.update(walletsTable)
          .set({
            availableBalance: String(Number(fWallet.availableBalance) + freelancerShare),
            totalEarned: String(Number(fWallet.totalEarned) + freelancerShare),
          })
          .where(eq(walletsTable.id, fWallet.id));

        await tx.update(escrowAccountsTable)
          .set({
            releasedAmount: String(Number(escrow.releasedAmount) + freelancerShare),
            refundedAmount: String(Number(escrow.refundedAmount) + clientShare),
            status: "completed"
          })
          .where(eq(escrowAccountsTable.id, escrow.id));

        await tx.update(projectsTable).set({ status: "completed", completedAt: new Date() }).where(eq(projectsTable.id, project.id));
        await tx.update(milestonesTable).set({ status: "released" }).where(and(eq(milestonesTable.projectId, project.id), eq(milestonesTable.status, "disputed")));

        // Record transactions
        await tx.insert(walletTransactionsTable).values({
          walletId: cWallet.id,
          type: "escrow_release",
          amount: String(freelancerShare),
          description: `Dispute resolved split: Released share to freelancer`,
          referenceId: disputeId,
          referenceType: "dispute",
          status: "completed",
        });

        await tx.insert(walletTransactionsTable).values({
          walletId: cWallet.id,
          type: "refund",
          amount: String(clientShare),
          description: `Dispute resolved split: Refunded share to client`,
          referenceId: disputeId,
          referenceType: "dispute",
          status: "completed",
        });

        await tx.insert(walletTransactionsTable).values({
          walletId: fWallet.id,
          type: "credit",
          amount: String(freelancerShare),
          description: `Dispute resolved split: Received share release`,
          referenceId: disputeId,
          referenceType: "dispute",
          status: "completed",
        });

      } else if (action === "extend") {
        if (!newDeadline) throw new Error("New deadline required to extend");
        await tx.update(projectsTable).set({ deadline: new Date(newDeadline), status: "active" }).where(eq(projectsTable.id, project.id));
        await tx.update(escrowAccountsTable).set({ status: "funded" }).where(eq(escrowAccountsTable.id, escrow.id));
        await tx.update(milestonesTable).set({ status: "funded" }).where(and(eq(milestonesTable.projectId, project.id), eq(milestonesTable.status, "disputed")));
      }

      // Update dispute record
      await tx.update(disputesTable)
        .set({ status: "resolved", resolution: `Mediation complete: ${action}. F:${freelancerShare}/C:${clientShare}`, resolvedAt: new Date() })
        .where(eq(disputesTable.id, disputeId));

      // Log in activity logs
      await tx.insert(activityLogsTable).values({
        projectId: project.id,
        userId: req.userId!,
        action: "dispute_resolved",
        details: `Dispute resolved by Admin: ${action}`,
        entityType: "dispute",
        entityId: disputeId,
      });

      // Send notifications to client and freelancer
      const notifyMessage = `Dispute on project "${project.title}" has been resolved by Admin: ${action.toUpperCase()}`;
      await tx.insert(notificationsTable).values({
        userId: project.clientId,
        type: "project_update",
        title: "Dispute Resolved",
        body: notifyMessage,
        link: `/projects/${project.id}`,
      });
      await tx.insert(notificationsTable).values({
        userId: project.freelancerId,
        type: "project_update",
        title: "Dispute Resolved",
        body: notifyMessage,
        link: `/projects/${project.id}`,
      });
    });
  } catch (err: any) {
    console.error("Mediation transaction failed:", err);
    res.status(500).json({ error: err.message || "Failed to resolve dispute" });
    return;
  }

  res.json({ ok: true, action });
});

router.get("/admin/config", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  try {
    let config = await db.query.taxConfigurationsTable.findFirst({
      orderBy: [desc(taxConfigurationsTable.id)]
    });
    if (!config) {
      const [created] = await db.insert(taxConfigurationsTable).values({}).returning();
      config = created;
    }
    res.json({
      platformCommissionRate: Number(config.platformCommissionRate),
      gstOnCommissionRate: Number(config.gstOnCommissionRate),
      cgstRate: Number(config.cgstRate),
      sgstRate: Number(config.sgstRate),
      igstRate: Number(config.igstRate),
      tdsRate: Number(config.tdsRate),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch configurations" });
  }
});

router.post("/admin/config", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const parsed = z.object({
    platformCommissionRate: z.number().min(0).max(100),
  }).safeParse(req.body);

  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid rate" }); return; }

  try {
    const existing = await db.query.taxConfigurationsTable.findFirst({
      orderBy: [desc(taxConfigurationsTable.id)]
    });

    let config;
    if (existing) {
      [config] = await db.update(taxConfigurationsTable)
        .set({
          platformCommissionRate: String(parsed.data.platformCommissionRate),
          updatedAt: new Date(),
        })
        .where(eq(taxConfigurationsTable.id, existing.id))
        .returning();
    } else {
      [config] = await db.insert(taxConfigurationsTable)
        .values({
          platformCommissionRate: String(parsed.data.platformCommissionRate),
        })
        .returning();
    }

    res.json({ success: true, platformCommissionRate: Number(config.platformCommissionRate) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update configurations" });
  }
});

// USER SUSPEND
router.post("/admin/users/:id/suspend", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const userId = parseInt(String(req.params.id));
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  try {
    const [updated] = await db.update(usersTable)
      .set({ isSuspended: true })
      .where(eq(usersTable.id, userId))
      .returning();

    await db.insert(adminAuditLogsTable).values({
      adminId: req.userId!,
      action: "update",
      targetType: "user",
      targetId: userId,
      newValue: { isSuspended: true },
      reason: "User suspended by admin"
    });

    broadcastToAll("dashboard_update", { type: "user_suspended", userId });
    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to suspend user" });
  }
});

// USER BAN
router.post("/admin/users/:id/ban", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const userId = parseInt(String(req.params.id));
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  try {
    const [updated] = await db.update(usersTable)
      .set({ isSuspended: true, bio: "Account banned by administrator" })
      .where(eq(usersTable.id, userId))
      .returning();

    await db.insert(adminAuditLogsTable).values({
      adminId: req.userId!,
      action: "update",
      targetType: "user",
      targetId: userId,
      newValue: { isSuspended: true, banned: true },
      reason: "User banned by admin"
    });

    broadcastToAll("dashboard_update", { type: "user_banned", userId });
    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to ban user" });
  }
});

// USER REACTIVATE
router.post("/admin/users/:id/reactivate", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const userId = parseInt(String(req.params.id));
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  try {
    const [updated] = await db.update(usersTable)
      .set({ isSuspended: false })
      .where(eq(usersTable.id, userId))
      .returning();

    await db.insert(adminAuditLogsTable).values({
      adminId: req.userId!,
      action: "update",
      targetType: "user",
      targetId: userId,
      newValue: { isSuspended: false },
      reason: "User reactivated by admin"
    });

    broadcastToAll("dashboard_update", { type: "user_reactivated", userId });
    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to reactivate user" });
  }
});

// USER DELETE (SAFE OR FORCE)
router.delete("/admin/users/:id", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const userId = parseInt(String(req.params.id));
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  try {
    await db.delete(usersTable).where(eq(usersTable.id, userId));
    await db.insert(adminAuditLogsTable).values({
      adminId: req.userId!,
      action: "delete",
      targetType: "user",
      targetId: userId,
      newValue: null,
      reason: "User permanently deleted by admin"
    });

    broadcastToAll("dashboard_update", { type: "user_deleted", userId });
    res.json({ success: true });
  } catch (err: any) {
    const [updated] = await db.update(usersTable)
      .set({ isSuspended: true, email: `deleted_${userId}@fintrust.com`, name: "Deleted User" })
      .where(eq(usersTable.id, userId))
      .returning();

    await db.insert(adminAuditLogsTable).values({
      adminId: req.userId!,
      action: "delete_fallback_suspend",
      targetType: "user",
      targetId: userId,
      newValue: { isSuspended: true },
      reason: "User deletion failed due to references; fallback to suspend"
    });

    broadcastToAll("dashboard_update", { type: "user_deleted_fallback", userId });
    res.json({ success: true, message: "User references exist. Account suspended and anonymized." });
  }
});

// USER RESET PASSWORD
router.post("/admin/users/:id/reset-password", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const userId = parseInt(String(req.params.id));
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const newPass = "ResetPassword123!";
  try {
    const hp = await hashPassword(newPass);
    await db.update(usersTable)
      .set({ passwordHash: hp })
      .where(eq(usersTable.id, userId));

    await db.insert(adminAuditLogsTable).values({
      adminId: req.userId!,
      action: "update",
      targetType: "user",
      targetId: userId,
      newValue: { passwordReset: true },
      reason: "User password reset by admin"
    });

    res.json({ success: true, newPassword: newPass });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to reset password" });
  }
});

// USER LOOKUPS
router.get("/admin/users/:id/wallet", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const userId = parseInt(String(req.params.id));
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  try {
    const wallet = await db.query.walletsTable.findFirst({ where: eq(walletsTable.userId, userId) });
    if (!wallet) {
      res.json({ availableBalance: "0.00", escrowBalance: "0.00", totalEarned: "0.00", totalSpent: "0.00", transactions: [] });
      return;
    }
    const txs = await db.query.walletTransactionsTable.findMany({
      where: eq(walletTransactionsTable.walletId, wallet.id),
      orderBy: [desc(walletTransactionsTable.createdAt)],
      limit: 50
    });
    res.json({ ...wallet, transactions: txs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/users/:id/escrows", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const userId = parseInt(String(req.params.id));
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  try {
    const escrows = await db.query.escrowAccountsTable.findMany({
      where: or(
        eq(escrowAccountsTable.clientId, userId),
        eq(escrowAccountsTable.freelancerId, userId)
      ),
      orderBy: [desc(escrowAccountsTable.createdAt)]
    });
    res.json(escrows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/users/:id/contracts", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const userId = parseInt(String(req.params.id));
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  try {
    const contracts = await db.query.projectsTable.findMany({
      where: or(
        eq(projectsTable.clientId, userId),
        eq(projectsTable.freelancerId, userId)
      ),
      orderBy: [desc(projectsTable.createdAt)]
    });
    res.json(contracts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/users/:id/jobs", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const userId = parseInt(String(req.params.id));
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  try {
    const jobs = await db.query.jobsTable.findMany({
      where: eq(jobsTable.clientId, userId),
      orderBy: [desc(jobsTable.createdAt)]
    });
    res.json(jobs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/users/:id/proposals", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const userId = parseInt(String(req.params.id));
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  try {
    const proposals = await db.query.proposalsTable.findMany({
      where: eq(proposalsTable.freelancerId, userId),
      orderBy: [desc(proposalsTable.createdAt)]
    });
    res.json(proposals);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// JOB MANAGEMENT CRUD
router.get("/admin/jobs", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const jobs = await db.query.jobsTable.findMany({ orderBy: [desc(jobsTable.createdAt)] });
    res.json(jobs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/jobs/:id/approve", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(String(req.params.id));
  try {
    const [job] = await db.update(jobsTable).set({ status: "open" }).where(eq(jobsTable.id, id)).returning();
    await db.insert(adminAuditLogsTable).values({
      adminId: req.userId!,
      action: "update",
      targetType: "job",
      targetId: id,
      newValue: { status: "open" },
      reason: "Job approved by admin"
    });
    broadcastToAll("dashboard_update", { type: "job_approved", jobId: id });
    res.json(job);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/jobs/:id/reject", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(String(req.params.id));
  try {
    const [job] = await db.update(jobsTable).set({ status: "rejected" }).where(eq(jobsTable.id, id)).returning();
    await db.insert(adminAuditLogsTable).values({
      adminId: req.userId!,
      action: "update",
      targetType: "job",
      targetId: id,
      newValue: { status: "rejected" },
      reason: "Job rejected by admin"
    });
    broadcastToAll("dashboard_update", { type: "job_rejected", jobId: id });
    res.json(job);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/jobs/:id/feature", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(String(req.params.id));
  try {
    const [featured] = await db.insert(featuredJobsTable).values({
      jobId: id,
      isSponsored: true,
      expiryDate: new Date(Date.now() + 30 * 24 * 3600 * 1000)
    }).returning();

    await db.insert(adminAuditLogsTable).values({
      adminId: req.userId!,
      action: "create",
      targetType: "featured_job",
      targetId: featured.id,
      newValue: featured,
      reason: "Job featured by admin"
    });
    broadcastToAll("dashboard_update", { type: "job_featured", jobId: id });
    res.json(featured);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/jobs/:id/close", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(String(req.params.id));
  try {
    const [job] = await db.update(jobsTable).set({ status: "closed" }).where(eq(jobsTable.id, id)).returning();
    await db.insert(adminAuditLogsTable).values({
      adminId: req.userId!,
      action: "update",
      targetType: "job",
      targetId: id,
      newValue: { status: "closed" },
      reason: "Job closed by admin"
    });
    broadcastToAll("dashboard_update", { type: "job_closed", jobId: id });
    res.json(job);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/admin/jobs/:id", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(String(req.params.id));
  try {
    await db.delete(jobsTable).where(eq(jobsTable.id, id));
    await db.insert(adminAuditLogsTable).values({
      adminId: req.userId!,
      action: "delete",
      targetType: "job",
      targetId: id,
      newValue: null,
      reason: "Job deleted by admin"
    });
    broadcastToAll("dashboard_update", { type: "job_deleted", jobId: id });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PROPOSAL/APPLICATION MANAGEMENT
router.get("/admin/proposals", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const proposals = await db.query.proposalsTable.findMany({ orderBy: [desc(proposalsTable.createdAt)] });
    res.json(proposals);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/proposals/:id/shortlist", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(String(req.params.id));
  try {
    const [prop] = await db.update(proposalsTable).set({ status: "shortlisted" }).where(eq(proposalsTable.id, id)).returning();
    res.json(prop);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/proposals/:id/reject", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(String(req.params.id));
  try {
    const [prop] = await db.update(proposalsTable).set({ status: "rejected" }).where(eq(proposalsTable.id, id)).returning();
    res.json(prop);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/admin/proposals/:id", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(String(req.params.id));
  try {
    await db.delete(proposalsTable).where(eq(proposalsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DISPUTE ASSIGN
router.post("/admin/disputes/:id/assign", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(String(req.params.id));
  try {
    const [disp] = await db.update(disputesTable).set({ status: "under_review" }).where(eq(disputesTable.id, id)).returning();
    res.json(disp);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// REPORT GENERATOR (CSV EXPORT)
router.get("/admin/reports/export", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const type = String(req.query.type || "users");

  try {
    if (type === "users") {
      const records = await db.query.usersTable.findMany();
      let csv = "ID,Name,Email,Role,IsVerified,CreatedAt\n";
      for (const r of records) {
        csv += `${r.id},"${r.name.replace(/"/g, '""')}","${r.email}",${r.role},${r.isVerified},${r.createdAt.toISOString()}\n`;
      }
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=users_report.csv");
      res.send(csv);
    } else if (type === "transactions") {
      const records = await db.query.walletTransactionsTable.findMany({ orderBy: [desc(walletTransactionsTable.createdAt)] });
      let csv = "ID,WalletID,Type,Amount,Status,Description,CreatedAt\n";
      for (const r of records) {
        csv += `${r.id},${r.walletId},${r.type},${r.amount},${r.status},"${r.description.replace(/"/g, '""')}",${r.createdAt.toISOString()}\n`;
      }
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=transactions_report.csv");
      res.send(csv);
    } else {
      res.status(400).json({ error: "Unsupported report type" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
