import { Router, type IRouter } from "express";
import { eq, or, desc } from "drizzle-orm";
import { db, projectsTable, usersTable, milestonesTable, notificationsTable } from "@workspace/db";
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
});

const CreateMilestoneBody = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().positive(),
  order: z.number().int().optional(),
  dueDate: z.string().datetime().optional(),
});

router.post("/projects", requireAuth, async (req, res) => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid" }); return; }

  const { freelancerId, title, description, budget, jobId, deadline } = parsed.data;

  const freelancer = await db.query.usersTable.findFirst({ where: eq(usersTable.id, freelancerId) });
  if (!freelancer || freelancer.role !== "freelancer") { res.status(400).json({ error: "Freelancer not found" }); return; }

  const [project] = await db.insert(projectsTable).values({
    clientId: req.userId!,
    freelancerId,
    title,
    description,
    budget: String(budget),
    jobId: jobId ?? null,
    deadline: deadline ? new Date(deadline) : null,
    status: "active",
  }).returning();

  await db.insert(notificationsTable).values({
    userId: freelancerId,
    type: "project_update",
    title: "New project started",
    body: `A new project "${title}" has been created for you.`,
    link: `/projects/${project?.id}`,
  });

  res.status(201).json(project ? serializeProject(project) : null);
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

export default router;
