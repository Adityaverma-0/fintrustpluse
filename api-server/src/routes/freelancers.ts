import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const router: IRouter = Router();

function toNum(v: string | null | undefined) {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

router.get("/freelancers", async (_req, res) => {
  const freelancers = await db.query.usersTable.findMany({
    where: eq(usersTable.role, "freelancer"),
  });

  res.json(freelancers.map(f => {
    const { passwordHash: _ph, ...safe } = f;
    return {
      ...safe,
      hourlyRate: toNum(f.hourlyRate),
      trustScore: toNum(f.trustScore),
      totalEarned: toNum(f.totalEarned),
      completionRate: toNum(f.completionRate),
    };
  }));
});

router.get("/freelancers/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, id) });
  if (!user || user.role !== "freelancer") { res.status(404).json({ error: "Not found" }); return; }

  const { passwordHash: _ph, ...safe } = user;
  res.json({
    ...safe,
    hourlyRate: toNum(user.hourlyRate),
    trustScore: toNum(user.trustScore),
    totalEarned: toNum(user.totalEarned),
    completionRate: toNum(user.completionRate),
  });
});

export default router;
