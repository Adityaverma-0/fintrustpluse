import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, activityLogsTable, projectsTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/projects/:id/activity", requireAuth, async (req, res) => {
  const projectId = parseInt(String(req.params.id));
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, projectId) });
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  if (project.clientId !== req.userId && project.freelancerId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const logs = await db.query.activityLogsTable.findMany({
    where: eq(activityLogsTable.projectId, projectId),
    orderBy: [desc(activityLogsTable.createdAt)],
  });

  const enriched = await Promise.all(logs.map(async (log) => {
    const user = log.userId ? await db.query.usersTable.findFirst({ where: eq(usersTable.id, log.userId) }) : null;
    return { ...log, user: user ? { id: user.id, name: user.name, role: user.role } : null };
  }));

  res.json(enriched);
});

export default router;
