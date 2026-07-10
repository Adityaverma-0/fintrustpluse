import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, submissionsTable, projectsTable, milestonesTable, notificationsTable, activityLogsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { z } from "zod";

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

export default router;
