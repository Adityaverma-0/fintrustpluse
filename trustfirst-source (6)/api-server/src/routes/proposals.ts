import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, proposalsTable, jobsTable, usersTable, notificationsTable, walletsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { z } from "zod";

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

  if (status === "accepted") {
    await db.insert(notificationsTable).values({
      userId: proposal.freelancerId,
      type: "proposal",
      title: "Proposal accepted!",
      body: `Your proposal for "${job.title}" was accepted. Check your projects.`,
      link: "/dashboard/freelancer",
    });

    const wallet = await db.query.walletsTable.findFirst({ where: eq(walletsTable.userId, proposal.freelancerId) });
    if (!wallet) {
      await db.insert(walletsTable).values({ userId: proposal.freelancerId });
    }
  }

  res.json({ ...updated, bidAmount: toNum(updated?.bidAmount) });
});

export default router;
