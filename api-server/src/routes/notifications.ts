import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req, res) => {
  const notifications = await db.query.notificationsTable.findMany({
    where: eq(notificationsTable.userId, req.userId!),
    orderBy: [desc(notificationsTable.createdAt)],
  });
  res.json(notifications);
});

router.patch("/notifications/:id/read", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.id, id));

  res.json({ ok: true });
});

router.patch("/notifications/read-all", requireAuth, async (req, res) => {
  await db.update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, req.userId!));

  res.json({ ok: true });
});

export default router;
