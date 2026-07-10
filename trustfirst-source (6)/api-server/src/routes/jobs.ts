import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, jobsTable, usersTable, activityLogsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { z } from "zod";

const router: IRouter = Router();

function toNum(v: string | null | undefined) {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

const JobInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  budgetType: z.enum(["fixed", "hourly"]),
  budget: z.number().positive(),
  duration: z.string().optional(),
  experienceLevel: z.string().optional(),
  skills: z.string().optional(),
  deadline: z.string().datetime().optional(),
  screeningQuestions: z.string().optional(),
  visibility: z.enum(["public", "invite_only"]).optional(),
  freelancersNeeded: z.number().int().positive().optional(),
});

router.get("/jobs", async (_req, res) => {
  const jobs = await db.query.jobsTable.findMany({
    orderBy: [desc(jobsTable.createdAt)],
  });

  const enriched = await Promise.all(jobs.map(async (j) => {
    const client = await db.query.usersTable.findFirst({ where: eq(usersTable.id, j.clientId) });
    return {
      ...j,
      budget: toNum(j.budget),
      client: client ? { id: client.id, name: client.name, country: client.country, isVerified: client.isVerified } : null,
    };
  }));

  res.json(enriched);
});

router.get("/jobs/mine", requireAuth, async (req, res) => {
  const jobs = await db.query.jobsTable.findMany({
    where: eq(jobsTable.clientId, req.userId!),
    orderBy: [desc(jobsTable.createdAt)],
  });
  res.json(jobs.map(j => ({ ...j, budget: toNum(j.budget) })));
});

router.get("/jobs/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const job = await db.query.jobsTable.findFirst({ where: eq(jobsTable.id, id) });
  if (!job) { res.status(404).json({ error: "Not found" }); return; }

  const client = await db.query.usersTable.findFirst({ where: eq(usersTable.id, job.clientId) });
  res.json({
    ...job,
    budget: toNum(job.budget),
    client: client ? { id: client.id, name: client.name, country: client.country, isVerified: client.isVerified, totalSpent: toNum(client.totalSpent) } : null,
  });
});

router.post("/jobs", requireAuth, async (req, res) => {
  const parsed = JobInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const { title, description, category, budgetType, budget, duration, experienceLevel, skills, deadline, screeningQuestions, visibility, freelancersNeeded } = parsed.data;

  const [job] = await db.insert(jobsTable).values({
    title,
    description,
    category,
    budgetType,
    budget: String(budget),
    duration: duration ?? null,
    experienceLevel: experienceLevel ?? null,
    skills: skills ?? null,
    status: "open",
    clientId: req.userId!,
  }).returning();

  await db.insert(activityLogsTable).values({
    userId: req.userId!,
    action: "job_posted",
    details: `Job "${title}" posted`,
    entityType: "job",
    entityId: job?.id,
  });

  res.status(201).json(job ? { ...job, budget: toNum(job.budget) } : null);
});

router.patch("/jobs/:id/status", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = z.object({ status: z.enum(["open", "closed", "filled"]) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid" }); return; }

  const job = await db.query.jobsTable.findFirst({ where: eq(jobsTable.id, id) });
  if (!job) { res.status(404).json({ error: "Not found" }); return; }
  if (job.clientId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const [updated] = await db.update(jobsTable).set({ status: parsed.data.status }).where(eq(jobsTable.id, id)).returning();
  res.json(updated ? { ...updated, budget: toNum(updated.budget) } : null);
});

export default router;
