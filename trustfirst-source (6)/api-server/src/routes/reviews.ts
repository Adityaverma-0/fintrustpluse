import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, reviewsTable, usersTable, activityLogsTable, notificationsTable, projectsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { z } from "zod";

const router: IRouter = Router();

const CreateReviewBody = z.object({
  projectId: z.number().int().positive(),
  revieweeId: z.number().int().positive(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

router.post("/reviews", requireAuth, async (req, res) => {
  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const { projectId, revieweeId, rating, comment } = parsed.data;

  // Authorization: reviewer must be a participant on this project
  const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, projectId) });
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  if (project.clientId !== req.userId && project.freelancerId !== req.userId) {
    res.status(403).json({ error: "You are not a participant on this project" }); return;
  }

  // revieweeId must be the other participant
  const expectedRevieweeId =
    req.userId === project.clientId ? project.freelancerId : project.clientId;
  if (revieweeId !== expectedRevieweeId) {
    res.status(400).json({ error: "You can only review the other participant on this project" });
    return;
  }

  // One review per reviewer per project (enforce uniqueness)
  const existingReview = await db.query.reviewsTable.findFirst({
    where: and(
      eq(reviewsTable.projectId, projectId),
      eq(reviewsTable.reviewerId, req.userId!)
    ),
  });
  if (existingReview) {
    res.status(409).json({ error: "You have already submitted a review for this project" });
    return;
  }

  const [review] = await db.insert(reviewsTable).values({
    projectId,
    reviewerId: req.userId!,
    revieweeId,
    rating: String(rating),
    comment: comment ?? null,
  }).returning();

  // Recalculate trust score for the reviewee from ALL their reviews
  const allReviews = await db.query.reviewsTable.findMany({
    where: eq(reviewsTable.revieweeId, revieweeId),
  });
  const avgRating =
    allReviews.reduce((sum, r) => sum + Number(r.rating), 0) / allReviews.length;
  const trustScore = Math.min(100, Math.round(avgRating * 20)); // 5.0 → 100

  await db.update(usersTable)
    .set({ trustScore: String(trustScore) })
    .where(eq(usersTable.id, revieweeId));

  await db.insert(notificationsTable).values({
    userId: revieweeId,
    type: "review",
    title: "New review received",
    body: `You received a ${rating}-star review. Your trust score has been updated to ${trustScore}.`,
    link: `/profile/${revieweeId}`,
  });

  await db.insert(activityLogsTable).values({
    projectId,
    userId: req.userId!,
    action: "review_submitted",
    details: `${rating}-star review submitted`,
    entityType: "review",
    entityId: review?.id,
  });

  res.status(201).json(review ? { ...review, rating: Number(review.rating) } : null);
});

router.get("/users/:userId/reviews", async (req, res) => {
  const userId = parseInt(String(req.params.userId));
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const reviews = await db.query.reviewsTable.findMany({
    where: eq(reviewsTable.revieweeId, userId),
    orderBy: [desc(reviewsTable.createdAt)],
  });

  const enriched = await Promise.all(reviews.map(async (r) => {
    const reviewer = await db.query.usersTable.findFirst({ where: eq(usersTable.id, r.reviewerId) });
    return {
      ...r,
      rating: Number(r.rating),
      reviewer: reviewer
        ? { id: reviewer.id, name: reviewer.name, avatarUrl: reviewer.avatarUrl }
        : null,
    };
  }));

  res.json(enriched);
});

export default router;
