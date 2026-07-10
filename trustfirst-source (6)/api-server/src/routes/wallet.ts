import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, walletsTable, walletTransactionsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { z } from "zod";

const router: IRouter = Router();

async function getOrCreateWallet(userId: number) {
  let wallet = await db.query.walletsTable.findFirst({ where: eq(walletsTable.userId, userId) });
  if (!wallet) {
    const [created] = await db.insert(walletsTable).values({ userId }).returning();
    wallet = created!;
  }
  return wallet;
}

function serializeWallet(w: typeof walletsTable.$inferSelect) {
  return {
    ...w,
    availableBalance: Number(w.availableBalance),
    escrowBalance: Number(w.escrowBalance),
    totalEarned: Number(w.totalEarned),
    totalSpent: Number(w.totalSpent),
  };
}

router.get("/wallet", requireAuth, async (req, res) => {
  const wallet = await getOrCreateWallet(req.userId!);
  res.json(serializeWallet(wallet));
});

router.get("/wallet/transactions", requireAuth, async (req, res) => {
  const wallet = await getOrCreateWallet(req.userId!);
  const transactions = await db.query.walletTransactionsTable.findMany({
    where: eq(walletTransactionsTable.walletId, wallet.id),
    orderBy: [desc(walletTransactionsTable.createdAt)],
  });
  res.json(transactions.map(t => ({ ...t, amount: Number(t.amount) })));
});

router.post("/wallet/deposit", requireAuth, async (req, res) => {
  const parsed = z.object({
    amount: z.number().positive(),
    method: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid" }); return; }

  const { amount, method } = parsed.data;
  const wallet = await getOrCreateWallet(req.userId!);

  const newBalance = Number(wallet.availableBalance) + amount;
  await db.update(walletsTable)
    .set({ availableBalance: String(newBalance) })
    .where(eq(walletsTable.userId, req.userId!));

  await db.insert(walletTransactionsTable).values({
    walletId: wallet.id,
    type: "credit",
    amount: String(amount),
    description: `Deposit via ${method ?? "wallet"}`,
    status: "completed",
  });

  const updated = await db.query.walletsTable.findFirst({ where: eq(walletsTable.userId, req.userId!) });
  res.json(serializeWallet(updated!));
});

router.post("/wallet/withdraw", requireAuth, async (req, res) => {
  const parsed = z.object({
    amount: z.number().positive(),
    method: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid" }); return; }

  const { amount, method } = parsed.data;
  const wallet = await getOrCreateWallet(req.userId!);

  if (Number(wallet.availableBalance) < amount) { res.status(400).json({ error: "Insufficient balance" }); return; }

  const newBalance = Number(wallet.availableBalance) - amount;
  await db.update(walletsTable)
    .set({ availableBalance: String(newBalance) })
    .where(eq(walletsTable.userId, req.userId!));

  await db.insert(walletTransactionsTable).values({
    walletId: wallet.id,
    type: "debit",
    amount: String(amount),
    description: `Withdrawal to ${method ?? "bank account"}`,
    status: "completed",
  });

  const updated = await db.query.walletsTable.findFirst({ where: eq(walletsTable.userId, req.userId!) });
  res.json(serializeWallet(updated!));
});

export default router;
