import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import {
  db,
  escrowAccountsTable,
  projectsTable,
  walletsTable,
  walletTransactionsTable,
  notificationsTable,
  activityLogsTable,
  milestonesTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { z } from "zod";
import { broadcastToUser } from "../lib/realtime";
import { generateInvoiceForEvent } from "../lib/invoices";

const router: IRouter = Router();

async function getOrCreateWallet(userId: number) {
  let wallet = await db.query.walletsTable.findFirst({ where: eq(walletsTable.userId, userId) });
  if (!wallet) {
    const [created] = await db.insert(walletsTable).values({ userId }).returning();
    wallet = created!;
  }
  return wallet;
}

router.get("/projects/:id/escrow", requireAuth, async (req, res) => {
  const projectId = parseInt(String(req.params.id));
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, projectId) });
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  if (project.clientId !== req.userId && project.freelancerId !== req.userId) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const escrow = await db.query.escrowAccountsTable.findFirst({
    where: eq(escrowAccountsTable.projectId, projectId),
  });
  if (!escrow) { res.status(404).json({ error: "No escrow account for this project" }); return; }

  res.json({
    ...escrow,
    totalAmount: Number(escrow.totalAmount),
    releasedAmount: Number(escrow.releasedAmount),
    refundedAmount: Number(escrow.refundedAmount),
    pendingAmount:
      Number(escrow.totalAmount) -
      Number(escrow.releasedAmount) -
      Number(escrow.refundedAmount),
  });
});

router.post("/projects/:id/escrow/fund", requireAuth, async (req, res) => {
  const projectId = parseInt(String(req.params.id));
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = z.object({ amount: z.number().positive() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid" });
    return;
  }

  const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, projectId) });
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  if (project.clientId !== req.userId) {
    res.status(403).json({ error: "Only the client can fund escrow" }); return;
  }

  const { amount } = parsed.data;

  // Atomic: debit client available, credit client escrow, upsert escrow account
  let escrowId = 0;
  let clientWalletId = 0;
  let txRecord: any;

  try {
    await db.transaction(async (tx) => {
      // Lock and read client wallet
      const [clientWallet] = await tx
        .select()
        .from(walletsTable)
        .where(eq(walletsTable.userId, project.clientId))
        .for("update");

      let wallet = clientWallet;
      if (!wallet) {
        const [created] = await tx
          .insert(walletsTable)
          .values({ userId: project.clientId })
          .returning();
        wallet = created!;
      }

      const available = Number(wallet.availableBalance);
      if (available < amount) {
        throw new Error("Insufficient available balance");
      }

      clientWalletId = wallet.id;

      // Move funds
      await tx
        .update(walletsTable)
        .set({
          availableBalance: String(available - amount),
          escrowBalance: String(Number(wallet.escrowBalance) + amount),
        })
        .where(eq(walletsTable.id, wallet.id));

      // Upsert escrow account
      const existing = await tx.query.escrowAccountsTable.findFirst({
        where: eq(escrowAccountsTable.projectId, projectId),
      });
      if (!existing) {
        const [created] = await tx
          .insert(escrowAccountsTable)
          .values({
            projectId,
            clientId: project.clientId,
            freelancerId: project.freelancerId,
            totalAmount: String(amount),
            status: "funded",
            fundedAt: new Date(),
          })
          .returning();
        escrowId = created!.id;
      } else {
        await tx
          .update(escrowAccountsTable)
          .set({
            totalAmount: existing.status === "pending" ? String(amount) : String(Number(existing.totalAmount) + amount),
            status: "funded",
            fundedAt: existing.fundedAt ?? new Date(),
          })
          .where(eq(escrowAccountsTable.id, existing.id));
        escrowId = existing.id;
      }

      // Update project status to active
      await tx
        .update(projectsTable)
        .set({ status: "active" })
        .where(eq(projectsTable.id, projectId));

      // Update milestones status: only the first milestone (minimum order) becomes active ("funded"), others pending
      const projMilestones = await tx.query.milestonesTable.findMany({
        where: eq(milestonesTable.projectId, projectId),
        orderBy: [sql`"order" ASC`]
      });
      if (projMilestones.length > 0) {
        await tx.update(milestonesTable)
          .set({ status: "funded" })
          .where(eq(milestonesTable.id, projMilestones[0].id));

        if (projMilestones.length > 1) {
          const otherIds = projMilestones.slice(1).map(m => m.id);
          for (const mId of otherIds) {
            await tx.update(milestonesTable)
              .set({ status: "pending" })
              .where(eq(milestonesTable.id, mId));
          }
        }
      }

      // ESCROW CALCULATION ENGINE VALIDATION
      const projectBudget = Number(project.budget);
      const commRate = Number(project.commissionRate);
      const platformCommissionVal = projectBudget * (commRate / 100);

      const currentEscrow = await tx.query.escrowAccountsTable.findFirst({
        where: eq(escrowAccountsTable.projectId, projectId)
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

      // Record transaction
      const [insertedTx] = await tx.insert(walletTransactionsTable).values({
        walletId: wallet.id,
        type: "escrow_hold",
        amount: String(amount),
        description: `Funds locked in escrow for project "${project.title}"`,
        referenceId: projectId,
        referenceType: "project",
        status: "completed",
      }).returning();
      txRecord = insertedTx;
    });

    try {
      await generateInvoiceForEvent("escrow_deposit", amount, project.clientId, project.freelancerId, {
        projectId,
        escrowAccountId: escrowId,
        transactionId: txRecord?.id,
      });
    } catch (invErr) {
      console.error("Escrow deposit invoice generation failed:", invErr);
    }
  } catch (err: any) {
    if (err.message === "Insufficient available balance") {
      res.status(400).json({ error: err.message });
    } else {
      console.error("Escrow fund error:", err);
      res.status(500).json({ error: "Failed to fund escrow" });
    }
    return;
  }

  await db.insert(notificationsTable).values({
    userId: project.freelancerId,
    type: "escrow",
    title: "Escrow funded",
    body: `$${amount} has been locked in escrow for project "${project.title}". Work can now begin.`,
    link: `/projects/${projectId}`,
  });

  await db.insert(activityLogsTable).values({
    projectId,
    userId: req.userId!,
    action: "escrow_funded",
    details: `$${amount} locked in escrow`,
    entityType: "escrow",
    entityId: escrowId!,
  });

  res.status(201).json({ ok: true, amount, projectId });
});

router.post(
  "/projects/:projectId/milestones/:milestoneId/release",
  requireAuth,
  async (req, res) => {
    const projectId = parseInt(String(req.params.projectId));
    const milestoneId = parseInt(String(req.params.milestoneId));
    if (isNaN(projectId) || isNaN(milestoneId)) {
      res.status(400).json({ error: "Invalid id" }); return;
    }

    const project = await db.query.projectsTable.findFirst({
      where: eq(projectsTable.id, projectId),
    });
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }
    if (project.clientId !== req.userId) {
      res.status(403).json({ error: "Only the client can release milestone payments" }); return;
    }

    const milestone = await db.query.milestonesTable.findFirst({
      where: eq(milestonesTable.id, milestoneId),
    });
    if (!milestone) { res.status(404).json({ error: "Milestone not found" }); return; }

    // Enforce milestone belongs to this project
    if (milestone.projectId !== projectId) {
      res.status(403).json({ error: "Milestone does not belong to this project" }); return;
    }

    // Enforce valid pre-release status (must be submitted or approved, not already released)
    if (milestone.status === "released") {
      res.status(409).json({ error: "Milestone payment already released" }); return;
    }
    if (!["submitted", "approved"].includes(milestone.status)) {
      res.status(400).json({
        error: `Cannot release payment for milestone in "${milestone.status}" status. It must be submitted or approved first.`,
      });
      return;
    }

    const amount = Number(milestone.amount);
    if (amount <= 0) { res.status(400).json({ error: "Invalid milestone amount" }); return; }

    let clientWalletId: number;
    let freelancerWalletId: number;
    let clientTxRecord: any;
    let escrowRecord: any;

    try {
      await db.transaction(async (tx) => {
        // Lock both wallets in consistent order (lower id first) to avoid deadlocks
        const allWallets = await tx
          .select()
          .from(walletsTable)
          .where(
            sql`${walletsTable.userId} IN (${project.clientId}, ${project.freelancerId})`
          )
          .for("update");

        let clientWallet = allWallets.find((w) => w.userId === project.clientId);
        let freelancerWallet = allWallets.find((w) => w.userId === project.freelancerId);

        // Create missing wallets inside the transaction
        if (!clientWallet) {
          const [created] = await tx
            .insert(walletsTable)
            .values({ userId: project.clientId })
            .returning();
          clientWallet = created!;
        }
        if (!freelancerWallet) {
          const [created] = await tx
            .insert(walletsTable)
            .values({ userId: project.freelancerId })
            .returning();
          freelancerWallet = created!;
        }

        clientWalletId = clientWallet.id;
        freelancerWalletId = freelancerWallet.id;

        const clientEscrow = Number(clientWallet.escrowBalance);
        if (clientEscrow < amount) {
          throw new Error(`Insufficient escrow balance ($${clientEscrow} < $${amount})`);
        }

        const projectBudget = Number(project.budget);
        const commRate = Number(project.commissionRate);
        const platformCommissionVal = projectBudget * (commRate / 100);

        const allMilestones = await tx.query.milestonesTable.findMany({
          where: eq(milestonesTable.projectId, project.id),
          orderBy: [sql`"order" ASC`]
        });
        const currentIdx = allMilestones.findIndex(m => m.id === milestoneId);
        const isFinalMilestone = currentIdx === allMilestones.length - 1;

        let newClientEscrow = clientEscrow - amount;
        if (isFinalMilestone) {
          newClientEscrow -= platformCommissionVal;
        }

        // Transfer: client escrow → freelancer available
        await Promise.all([
          tx.update(walletsTable)
            .set({
              escrowBalance: String(Math.max(0, newClientEscrow)),
              totalSpent: String(Number(clientWallet.totalSpent) + amount + (isFinalMilestone ? platformCommissionVal : 0)),
            })
            .where(eq(walletsTable.id, clientWallet.id)),

          tx.update(walletsTable)
            .set({
              availableBalance: String(Number(freelancerWallet.availableBalance) + amount),
              totalEarned: String(Number(freelancerWallet.totalEarned) + amount),
            })
            .where(eq(walletsTable.id, freelancerWallet.id)),

          tx.update(milestonesTable)
            .set({ status: "released", approvedAt: new Date() })
            .where(eq(milestonesTable.id, milestoneId)),
        ]);

        // Record transactions for both parties
        const [insertedClientTx] = await tx.insert(walletTransactionsTable).values({
          walletId: clientWallet.id,
          type: "escrow_release",
          amount: String(amount),
          description: `Escrow released for milestone "${milestone.title}"`,
          referenceId: milestoneId,
          referenceType: "milestone",
          status: "completed",
        }).returning();
        clientTxRecord = insertedClientTx;

        await tx.insert(walletTransactionsTable).values({
          walletId: freelancerWallet.id,
          type: "credit",
          amount: String(amount),
          description: `Payment received for milestone "${milestone.title}"`,
          referenceId: milestoneId,
          referenceType: "milestone",
          status: "completed",
        });

        // Update escrow account released amount
        const escrow = await tx.query.escrowAccountsTable.findFirst({
          where: eq(escrowAccountsTable.projectId, projectId),
        });
        if (escrow) {
          escrowRecord = escrow;
          const newReleased = Number(escrow.releasedAmount) + amount + (isFinalMilestone ? platformCommissionVal : 0);
          const isPaid = newReleased >= Number(escrow.totalAmount);
          await tx.update(escrowAccountsTable)
            .set({ releasedAmount: String(newReleased), status: isPaid ? "completed" : "funded" })
            .where(eq(escrowAccountsTable.id, escrow.id));
        }

        if (isFinalMilestone) {
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
          where: eq(escrowAccountsTable.projectId, projectId)
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
      });

      try {
        await generateInvoiceForEvent("milestone_release", amount, project.clientId, project.freelancerId, {
          projectId,
          milestoneId,
          transactionId: clientTxRecord?.id,
          escrowAccountId: escrowRecord?.id,
        });
      } catch (invErr) {
        console.error("Milestone release invoice generation failed:", invErr);
      }
    } catch (err: any) {
      if (err.message?.startsWith("Insufficient escrow")) {
        res.status(400).json({ error: err.message });
      } else {
        console.error("Escrow release error:", err);
        res.status(500).json({ error: "Failed to release milestone payment" });
      }
      return;
    }

    await db.insert(notificationsTable).values({
      userId: project.freelancerId,
      type: "payment",
      title: "Payment released!",
      body: `$${amount} has been released to your wallet for milestone "${milestone.title}".`,
      link: `/wallet`,
    });

    await db.insert(activityLogsTable).values({
      projectId,
      userId: req.userId!,
      action: "milestone_payment_released",
      details: `$${amount} released for milestone "${milestone.title}"`,
      entityType: "milestone",
      entityId: milestoneId,
    });

    broadcastToUser(project.clientId, "milestone_released", { projectId, milestoneId });
    broadcastToUser(project.freelancerId, "milestone_released", { projectId, milestoneId });
    broadcastToUser(project.clientId, "dashboard_update", {});
    broadcastToUser(project.freelancerId, "dashboard_update", {});

    res.json({ ok: true, amount, milestoneId, projectId });
  }
);

export default router;
