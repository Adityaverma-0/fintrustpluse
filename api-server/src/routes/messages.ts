import { Router, type IRouter } from "express";
import { eq, or, and, desc } from "drizzle-orm";
import { db, messagesTable, usersTable, projectsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { z } from "zod";
import { broadcastToUser } from "../lib/realtime";

const router: IRouter = Router();

const SendMessageBody = z.object({
  receiverId: z.number().int().positive(),
  content: z.string().min(1),
  projectId: z.number().int().positive().optional(),
});

router.post("/messages", requireAuth, async (req, res) => {
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid" }); return; }

  const { receiverId, content, projectId } = parsed.data;
  if (receiverId === req.userId) { res.status(400).json({ error: "Cannot message yourself" }); return; }

  if (projectId) {
    const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, projectId) });
    if (project && project.status !== "active") {
      res.status(403).json({ error: `Project is not active (status: ${project.status}). Escrow must be funded first.` });
      return;
    }
  }

  const [message] = await db.insert(messagesTable).values({
    senderId: req.userId!,
    receiverId,
    content,
    projectId: projectId ?? null,
  }).returning();

  broadcastToUser(receiverId, "message", message);
  broadcastToUser(req.userId!, "message", message);

  res.status(201).json(message);
});

router.get("/messages/conversations", requireAuth, async (req, res) => {
  const messages = await db.query.messagesTable.findMany({
    where: or(eq(messagesTable.senderId, req.userId!), eq(messagesTable.receiverId, req.userId!)),
    orderBy: [desc(messagesTable.createdAt)],
  });

  const partnerIds = new Set<number>();
  for (const m of messages) {
    const otherId = m.senderId === req.userId ? m.receiverId : m.senderId;
    partnerIds.add(otherId);
  }

  const conversations = await Promise.all([...partnerIds].map(async (partnerId) => {
    const partner = await db.query.usersTable.findFirst({ where: eq(usersTable.id, partnerId) });
    const lastMsg = messages.find(m => m.senderId === partnerId || m.receiverId === partnerId);
    const unread = messages.filter(m => m.senderId === partnerId && m.receiverId === req.userId && !m.isRead).length;
    return {
      partner: partner ? { id: partner.id, name: partner.name, role: partner.role } : { id: partnerId, name: "Unknown", role: "" },
      lastMessage: lastMsg ?? null,
      unreadCount: unread,
    };
  }));

  res.json(conversations);
});

router.get("/messages/:userId", requireAuth, async (req, res) => {
  const otherId = parseInt(String(req.params.userId));
  if (isNaN(otherId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const messages = await db.query.messagesTable.findMany({
    where: or(
      and(eq(messagesTable.senderId, req.userId!), eq(messagesTable.receiverId, otherId)),
      and(eq(messagesTable.senderId, otherId), eq(messagesTable.receiverId, req.userId!))
    ),
    orderBy: [desc(messagesTable.createdAt)],
  });

  // Mark received messages as read
  await Promise.all(
    messages
      .filter(m => m.receiverId === req.userId && !m.isRead)
      .map(m => db.update(messagesTable).set({ isRead: true }).where(eq(messagesTable.id, m.id)))
  );

  res.json(messages.reverse());
});

export default router;
