import { Router, type IRouter } from "express";
import { eq, count, desc, sql } from "drizzle-orm";
import { db, usersTable, jobsTable, projectsTable, proposalsTable, reviewsTable, walletsTable, disputesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function requireAdmin(req: any, res: any): Promise<boolean> {
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.userId!) });
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

router.get("/admin/stats", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const [
    totalUsers,
    totalJobs,
    totalProjects,
    activeProjects,
    completedProjects,
    totalProposals,
    totalDisputes,
  ] = await Promise.all([
    db.select({ count: count() }).from(usersTable),
    db.select({ count: count() }).from(jobsTable),
    db.select({ count: count() }).from(projectsTable),
    db.select({ count: count() }).from(projectsTable).where(eq(projectsTable.status, "active")),
    db.select({ count: count() }).from(projectsTable).where(eq(projectsTable.status, "completed")),
    db.select({ count: count() }).from(proposalsTable),
    db.select({ count: count() }).from(disputesTable),
  ]);

  const walletSums = await db.select({
    totalEscrow: sql<string>`SUM(escrow_balance)`,
    totalAvailable: sql<string>`SUM(available_balance)`,
    totalEarned: sql<string>`SUM(total_earned)`,
  }).from(walletsTable);

  const freelancers = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "freelancer"));
  const clients = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "client"));

  res.json({
    users: {
      total: totalUsers[0]?.count ?? 0,
      freelancers: freelancers[0]?.count ?? 0,
      clients: clients[0]?.count ?? 0,
    },
    jobs: { total: totalJobs[0]?.count ?? 0 },
    projects: {
      total: totalProjects[0]?.count ?? 0,
      active: activeProjects[0]?.count ?? 0,
      completed: completedProjects[0]?.count ?? 0,
    },
    proposals: { total: totalProposals[0]?.count ?? 0 },
    disputes: { total: totalDisputes[0]?.count ?? 0 },
    escrow: {
      totalLocked: Number(walletSums[0]?.totalEscrow ?? 0),
      totalAvailable: Number(walletSums[0]?.totalAvailable ?? 0),
      totalEarned: Number(walletSums[0]?.totalEarned ?? 0),
    },
  });
});

router.get("/admin/users", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const users = await db.query.usersTable.findMany({
    orderBy: [desc(usersTable.createdAt)],
  });

  res.json(users.map(u => {
    const { passwordHash: _ph, ...safe } = u;
    return {
      ...safe,
      hourlyRate: u.hourlyRate ? Number(u.hourlyRate) : null,
      trustScore: u.trustScore ? Number(u.trustScore) : null,
      totalEarned: u.totalEarned ? Number(u.totalEarned) : null,
      totalSpent: u.totalSpent ? Number(u.totalSpent) : null,
      completionRate: u.completionRate ? Number(u.completionRate) : null,
    };
  }));
});

router.get("/admin/disputes", requireAuth, async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const disputes = await db.query.disputesTable.findMany({
    orderBy: [desc(disputesTable.createdAt)],
  });

  const enriched = await Promise.all(disputes.map(async (d) => {
    const [project, raisedBy] = await Promise.all([
      db.query.projectsTable.findFirst({ where: eq(projectsTable.id, d.projectId) }),
      db.query.usersTable.findFirst({ where: eq(usersTable.id, d.raisedBy) }),
    ]);
    return {
      ...d,
      project: project ? { id: project.id, title: project.title } : null,
      raisedByUser: raisedBy ? { id: raisedBy.id, name: raisedBy.name, role: raisedBy.role } : null,
    };
  }));

  res.json(enriched);
});

export default router;
