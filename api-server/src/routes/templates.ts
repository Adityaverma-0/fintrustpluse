import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, milestoneTemplatesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { z } from "zod";

const router: IRouter = Router();

// GET /milestone-templates - Fetch user's templates
router.get("/milestone-templates", requireAuth, async (req, res) => {
  try {
    const templates = await db.query.milestoneTemplatesTable.findMany({
      where: eq(milestoneTemplatesTable.userId, req.userId!),
      orderBy: [desc(milestoneTemplatesTable.createdAt)]
    });
    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch milestone templates" });
  }
});

// POST /milestone-templates - Save a new milestone template
router.post("/milestone-templates", requireAuth, async (req, res) => {
  const parsed = z.object({
    name: z.string().min(1),
    structure: z.array(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        percentage: z.number().positive(),
        deliverables: z.string().min(1),
      })
    )
  }).safeParse(req.body);

  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid structure" }); return; }

  const { name, structure } = parsed.data;

  try {
    const [template] = await db.insert(milestoneTemplatesTable).values({
      userId: req.userId!,
      name,
      structure,
    }).returning();

    res.status(201).json(template);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to save milestone template" });
  }
});

export default router;
