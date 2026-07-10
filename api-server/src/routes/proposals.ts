import { Router, type IRouter } from "express";
import { eq, and, desc, ne } from "drizzle-orm";
import {
  db,
  proposalsTable,
  jobsTable,
  usersTable,
  notificationsTable,
  walletsTable,
  projectsTable,
  milestonesTable,
  escrowAccountsTable,
  contractsTable,
  activityLogsTable,
  messagesTable,
  walletTransactionsTable,
  taxConfigurationsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { z } from "zod";
import { broadcastToUser } from "../lib/realtime";

const router: IRouter = Router();

const CreateProposalBody = z.object({
  jobId: z.number().int().positive(),
  coverLetter: z.string().min(20),
  bidAmount: z.number().positive(),
  deliveryDays: z.number().int().positive(),
});

function toNum(v: string | null | undefined) {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

router.post("/proposals", requireAuth, async (req, res) => {
  const parsed = CreateProposalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const { jobId, coverLetter, bidAmount, deliveryDays } = parsed.data;

  const job = await db.query.jobsTable.findFirst({ where: eq(jobsTable.id, jobId) });
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }

  const existing = await db.query.proposalsTable.findFirst({
    where: and(eq(proposalsTable.jobId, jobId), eq(proposalsTable.freelancerId, req.userId!)),
  });
  if (existing) { res.status(409).json({ error: "You already submitted a proposal for this job" }); return; }

  const [proposal] = await db.insert(proposalsTable).values({
    jobId,
    freelancerId: req.userId!,
    coverLetter,
    bidAmount: String(bidAmount),
    deliveryDays,
    status: "pending",
  }).returning();

  await db.insert(notificationsTable).values({
    userId: job.clientId,
    type: "proposal",
    title: "New proposal received",
    body: `A freelancer submitted a proposal for "${job.title}"`,
    link: `/jobs/${jobId}`,
  });

  res.status(201).json({ ...proposal, bidAmount: toNum(proposal?.bidAmount) });
});

router.get("/proposals/mine", requireAuth, async (req, res) => {
  const proposals = await db.query.proposalsTable.findMany({
    where: eq(proposalsTable.freelancerId, req.userId!),
    orderBy: [desc(proposalsTable.createdAt)],
  });

  const enriched = await Promise.all(proposals.map(async (p) => {
    const job = await db.query.jobsTable.findFirst({ where: eq(jobsTable.id, p.jobId) });
    return { ...p, bidAmount: toNum(p.bidAmount), job: job ? { ...job, budget: Number(job.budget) } : null };
  }));

  res.json(enriched);
});

router.get("/jobs/:jobId/proposals", requireAuth, async (req, res) => {
  const jobId = parseInt(String(req.params.jobId));
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid job id" }); return; }

  const job = await db.query.jobsTable.findFirst({ where: eq(jobsTable.id, jobId) });
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  if (job.clientId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const proposals = await db.query.proposalsTable.findMany({
    where: eq(proposalsTable.jobId, jobId),
    orderBy: [desc(proposalsTable.createdAt)],
  });

  const enriched = await Promise.all(proposals.map(async (p) => {
    const freelancer = await db.query.usersTable.findFirst({ where: eq(usersTable.id, p.freelancerId) });
    return {
      ...p,
      bidAmount: toNum(p.bidAmount),
      freelancer: freelancer
        ? { id: freelancer.id, name: freelancer.name, title: freelancer.title, trustScore: toNum(freelancer.trustScore), completionRate: toNum(freelancer.completionRate) }
        : null,
    };
  }));

  res.json(enriched);
});

router.patch("/proposals/:id/status", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = z.object({ status: z.enum(["accepted", "rejected", "withdrawn"]) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid" }); return; }

  const { status } = parsed.data;
  const proposal = await db.query.proposalsTable.findFirst({ where: eq(proposalsTable.id, id) });
  if (!proposal) { res.status(404).json({ error: "Proposal not found" }); return; }

  if (status === "withdrawn") {
    if (proposal.freelancerId !== req.userId) { res.status(403).json({ error: "Only the proposal owner can withdraw it" }); return; }
    const [updated] = await db.update(proposalsTable).set({ status }).where(eq(proposalsTable.id, id)).returning();
    res.json({ ...updated, bidAmount: toNum(updated?.bidAmount) });
    return;
  }

  const job = await db.query.jobsTable.findFirst({ where: eq(jobsTable.id, proposal.jobId) });
  if (!job || job.clientId !== req.userId) { res.status(403).json({ error: "Only the job owner can accept or reject proposals" }); return; }

  const [updated] = await db.update(proposalsTable).set({ status }).where(eq(proposalsTable.id, id)).returning();

  let spawnedProjectId: number | undefined;

  if (status === "accepted") {
    await db.transaction(async (tx) => {
      // Create project in "accepted" status
      const deadlineDate = new Date(Date.now() + (proposal.deliveryDays || 14) * 24 * 60 * 60 * 1000);
      const [project] = await tx.insert(projectsTable).values({
        jobId: proposal.jobId,
        clientId: job.clientId,
        freelancerId: proposal.freelancerId,
        title: job.title,
        description: job.description,
        budget: proposal.bidAmount,
        status: "accepted",
        deadline: deadlineDate,
      }).returning();
      spawnedProjectId = project!.id;

      // Create pending escrow account for the project
      await tx.insert(escrowAccountsTable).values({
        projectId: project!.id,
        clientId: job.clientId,
        freelancerId: proposal.freelancerId,
        totalAmount: proposal.bidAmount,
        status: "pending",
      });

      // Create a default milestone representing 100% of budget
      await tx.insert(milestonesTable).values({
        projectId: project!.id,
        title: "Project Milestone",
        description: `Complete deliverables for ${job.title}`,
        amount: proposal.bidAmount,
        status: "pending",
        order: 1,
        dueDate: deadlineDate,
      });

      // Send notification
      await tx.insert(notificationsTable).values({
        userId: proposal.freelancerId,
        type: "proposal",
        title: "Proposal accepted!",
        body: `Your proposal for "${job.title}" was accepted. Check your projects.`,
        link: `/projects/${project!.id}`,
      });

      const wallet = await tx.query.walletsTable.findFirst({ where: eq(walletsTable.userId, proposal.freelancerId) });
      if (!wallet) {
        await tx.insert(walletsTable).values({ userId: proposal.freelancerId });
      }
    });
  }

  res.json({ ...updated, bidAmount: toNum(updated?.bidAmount), projectId: spawnedProjectId });
});

router.post("/proposals/:id/accept", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid proposal id" }); return; }

  try {
    const result = await db.transaction(async (tx) => {
      // Step 1: Validate
      const proposal = await tx.query.proposalsTable.findFirst({
        where: eq(proposalsTable.id, id),
      });
      if (!proposal) throw new Error("Proposal does not exist");
      if (proposal.status !== "pending") throw new Error("Proposal status must be pending");

      const job = await tx.query.jobsTable.findFirst({
        where: eq(jobsTable.id, proposal.jobId),
      });
      if (!job) throw new Error("Associated job does not exist");
      if (job.status !== "open") throw new Error("Job status must be open");
      if (job.clientId !== req.userId) throw new Error("Only the job owner client can accept proposals");

      const freelancer = await tx.query.usersTable.findFirst({
        where: eq(usersTable.id, proposal.freelancerId),
      });
      if (!freelancer || freelancer.role !== "freelancer") throw new Error("Freelancer does not exist or invalid role");

      const client = await tx.query.usersTable.findFirst({
        where: eq(usersTable.id, req.userId!),
      });
      if (!client) throw new Error("Client does not exist");

      // Step 2: Update Proposal
      const [updatedProposal] = await tx.update(proposalsTable)
        .set({
          status: "accepted",
          acceptedAt: new Date(),
          acceptedBy: req.userId!,
        })
        .where(eq(proposalsTable.id, id))
        .returning();

      // Step 3: Update Job and Reject Remaining Proposals
      await tx.update(jobsTable)
        .set({ status: "in_progress" })
        .where(eq(jobsTable.id, job.id));

      const otherProposals = await tx.query.proposalsTable.findMany({
        where: and(eq(proposalsTable.jobId, job.id), ne(proposalsTable.id, id), eq(proposalsTable.status, "pending")),
      });

      if (otherProposals.length > 0) {
        await tx.update(proposalsTable)
          .set({ status: "rejected" })
          .where(and(eq(proposalsTable.jobId, job.id), ne(proposalsTable.id, id), eq(proposalsTable.status, "pending")));

        // Notify rejected applicants
        for (const other of otherProposals) {
          await tx.insert(notificationsTable).values({
            userId: other.freelancerId,
            type: "proposal",
            title: "Application Status Update",
            body: `Your proposal for "${job.title}" was declined because another freelancer was hired.`,
            link: `/jobs/${job.id}`,
          });
        }
      }

      // Step 4: Create Project
      const deadlineDate = new Date(Date.now() + (proposal.deliveryDays || 14) * 24 * 60 * 60 * 1000);
      const [project] = await tx.insert(projectsTable).values({
        jobId: job.id,
        clientId: job.clientId,
        freelancerId: proposal.freelancerId,
        title: job.title,
        description: job.description,
        budget: proposal.bidAmount,
        status: "accepted", // starts as accepted (pending escrow deposit)
        deadline: deadlineDate,
        proposalId: proposal.id,
      }).returning();

      // Step 5: Generate Smart Contract
      const [contract] = await tx.insert(contractsTable).values({
        projectId: project.id,
        clientId: job.clientId,
        freelancerId: proposal.freelancerId,
        scope: job.description,
        deliverables: proposal.coverLetter || "As agreed in proposal and messaging.",
        timeline: `${proposal.deliveryDays} Days`,
        budget: proposal.bidAmount,
        status: "signed",
        clientSignedAt: new Date(),
      }).returning();

      // Store Contract ID inside Project
      await tx.update(projectsTable)
        .set({ contractId: contract.id })
        .where(eq(projectsTable.id, project.id));

      // Step 6: Initialize Smart Escrow
      // Check if client wallet has enough available balance to fund it upfront
      const clientWallet = await tx.query.walletsTable.findFirst({
        where: eq(walletsTable.userId, job.clientId),
      });

      const hasUpfrontBalance = clientWallet && Number(clientWallet.availableBalance) >= Number(proposal.bidAmount);
      const escrowStatus = hasUpfrontBalance ? "funded" : "pending";
      const projectStatus = hasUpfrontBalance ? "active" : "accepted";

      const [escrowAccount] = await tx.insert(escrowAccountsTable).values({
        projectId: project.id,
        clientId: job.clientId,
        freelancerId: proposal.freelancerId,
        totalAmount: proposal.bidAmount,
        status: escrowStatus,
      }).returning();

      if (hasUpfrontBalance) {
        // Auto-fund from client wallet
        const newAvailable = Number(clientWallet.availableBalance) - Number(proposal.bidAmount);
        const newEscrow = Number(clientWallet.escrowBalance) + Number(proposal.bidAmount);

        await tx.update(walletsTable)
          .set({
            availableBalance: String(newAvailable),
            escrowBalance: String(newEscrow),
          })
          .where(eq(walletsTable.id, clientWallet.id));

        // Update project status to active
        await tx.update(projectsTable)
          .set({ status: "active" })
          .where(eq(projectsTable.id, project.id));

        // Create wallet transaction record
        await tx.insert(walletTransactionsTable).values({
          walletId: clientWallet.id,
          type: "escrow_hold",
          amount: String(proposal.bidAmount),
          description: `Escrow hold for project "${job.title}" (Autofunded)`,
          status: "completed",
        });
      }

      // Step 7: Generate Milestones (representing 100% of budget minus platform commission)
      let commissionRate = req.body.commissionRate;
      if (commissionRate === undefined) {
        const config = await tx.query.taxConfigurationsTable.findFirst({
          orderBy: [desc(taxConfigurationsTable.id)]
        });
        commissionRate = config ? Number(config.platformCommissionRate) : 10;
      }
      
      let milestonesList = req.body.milestones;
      if (!milestonesList || milestonesList.length === 0) {
        const share = (100 - commissionRate) / 3;
        milestonesList = [
          { title: "Milestone 1", description: `First Phase of "${job.title}"`, percentage: share, deliverables: "Phase 1 deliverables" },
          { title: "Milestone 2", description: `Second Phase of "${job.title}"`, percentage: share, deliverables: "Phase 2 deliverables" },
          { title: "Milestone 3", description: `Third Phase of "${job.title}"`, percentage: share, deliverables: "Phase 3 deliverables" },
        ];
      }

      // Check duplicates
      const titles = milestonesList.map((m: any) => m.title.trim());
      const hasDuplicates = titles.some((val: string, i: number) => titles.indexOf(val) !== i);
      if (hasDuplicates) throw new Error("Duplicate milestone names are not allowed");

      // Verify sum of percentages
      const totalPercentage = milestonesList.reduce((sum: number, m: any) => sum + m.percentage, 0);
      const expectedSum = 100 - commissionRate;
      if (Math.abs(totalPercentage - expectedSum) > 0.01) {
        throw new Error(`Total milestone percentage must equal ${expectedSum}% of the project value (got ${totalPercentage.toFixed(2)}% with a ${commissionRate}% platform commission)`);
      }

      // Record project commission
      await tx.update(projectsTable)
        .set({ commissionRate: String(commissionRate) })
        .where(eq(projectsTable.id, project.id));

      // Save milestones
      let currentOrder = 1;
      const bidAmt = Number(proposal.bidAmount);
      for (const m of milestonesList) {
        const amount = bidAmt * (m.percentage / 100);
        // Sequential activation: first milestone becomes active ("funded") if project is funded, others pending
        const isFirst = currentOrder === 1;
        const status = hasUpfrontBalance && isFirst ? "funded" : "pending";
        
        await tx.insert(milestonesTable).values({
          projectId: project.id,
          title: m.title,
          description: m.description || null,
          percentage: String(m.percentage),
          amount: String(amount),
          status,
          dueDate: m.dueDate ? new Date(m.dueDate) : deadlineDate,
          deliverables: m.deliverables || "As specified in requirements.",
          order: currentOrder++,
        });
      }

      // Step 8: Create Project Workspace (Chat welcome message)
      await tx.insert(messagesTable).values({
        senderId: job.clientId,
        receiverId: proposal.freelancerId,
        content: `Project workspace initialized! Smart contract generated successfully. ${
          hasUpfrontBalance
            ? "Escrow is funded. Work can begin immediately!"
            : "Escrow funding is pending. Please fund the escrow to begin work."
        }`,
        projectId: project.id,
      });

      // Step 11: Timeline (Activity Logs)
      const timelineLogs = [
        { projectId: project.id, type: "project_created", message: "Project created" },
        { projectId: project.id, type: "contract_generated", message: "Contract generated" },
        { projectId: project.id, type: "escrow_initialized", message: "Escrow initialized" },
        { projectId: project.id, type: "freelancer_assigned", message: "Freelancer assigned" },
        { projectId: project.id, type: "milestone_created", message: "Milestone created" },
      ];
      for (const log of timelineLogs) {
        await tx.insert(activityLogsTable).values({
          projectId: log.projectId,
          action: log.type,
          details: log.message,
        });
      }

      // Ensure freelancer wallet exists
      const freelancerWallet = await tx.query.walletsTable.findFirst({
        where: eq(walletsTable.userId, proposal.freelancerId),
      });
      if (!freelancerWallet) {
        await tx.insert(walletsTable).values({ userId: proposal.freelancerId });
      }

      // Step 10: Notifications
      await tx.insert(notificationsTable).values({
        userId: job.clientId,
        type: "project",
        title: "Project successfully created.",
        body: `Project "${job.title}" has been successfully created.`,
        link: `/projects/${project.id}`,
      });

      await tx.insert(notificationsTable).values({
        userId: proposal.freelancerId,
        type: "project",
        title: "You have been hired.",
        body: `You have been hired for "${job.title}".`,
        link: `/projects/${project.id}`,
      });

      return {
        project,
        freelancerId: proposal.freelancerId,
        clientId: job.clientId,
      };
    });

    // Step 9 & 12: Realtime WebSocket Updates
    broadcastToUser(result.freelancerId, "proposal_accepted", { projectId: result.project.id });
    broadcastToUser(result.clientId, "proposal_accepted", { projectId: result.project.id });

    // Invalidate dashboards and trigger socket update
    broadcastToUser(result.freelancerId, "dashboard_update", {});
    broadcastToUser(result.clientId, "dashboard_update", {});

    res.status(200).json(result.project);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to accept proposal" });
  }
});

export default router;
