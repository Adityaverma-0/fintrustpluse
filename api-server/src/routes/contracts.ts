import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, contractsTable, projectsTable, usersTable, activityLogsTable, notificationsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { z } from "zod";

const router: IRouter = Router();

function generateContractScope(project: typeof projectsTable.$inferSelect): string {
  return `This contract covers the development and delivery of "${project.title}". The freelancer agrees to complete the project as described: ${project.description}`;
}

function generateDeliverables(project: typeof projectsTable.$inferSelect): string {
  return `All deliverables for "${project.title}" as outlined in the project description, delivered to professional standards with documentation and source files.`;
}

router.get("/projects/:id/contract", requireAuth, async (req, res) => {
  const projectId = parseInt(String(req.params.id));
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, projectId) });
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  if (project.clientId !== req.userId && project.freelancerId !== req.userId) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const contract = await db.query.contractsTable.findFirst({ where: eq(contractsTable.projectId, projectId) });
  if (!contract) { res.status(404).json({ error: "No contract found for this project" }); return; }

  res.json({ ...contract, budget: Number(contract.budget) });
});

router.post("/projects/:id/contract", requireAuth, async (req, res) => {
  const projectId = parseInt(String(req.params.id));
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, projectId) });
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  if (project.clientId !== req.userId) { res.status(403).json({ error: "Only the client can generate a contract" }); return; }

  const existing = await db.query.contractsTable.findFirst({ where: eq(contractsTable.projectId, projectId) });
  if (existing) { res.json({ ...existing, budget: Number(existing.budget) }); return; }

  const parsed = z.object({
    scope: z.string().optional(),
    deliverables: z.string().optional(),
    timeline: z.string().optional(),
    revisionPolicy: z.string().optional(),
    refundPolicy: z.string().optional(),
    paymentTerms: z.string().optional(),
    milestoneBreakdown: z.string().optional(),
  }).safeParse(req.body);

  const body = parsed.success ? parsed.data : {};

  const [contract] = await db.insert(contractsTable).values({
    projectId,
    clientId: project.clientId,
    freelancerId: project.freelancerId,
    scope: body.scope ?? generateContractScope(project),
    deliverables: body.deliverables ?? generateDeliverables(project),
    timeline: body.timeline ?? (project.deadline ? `Project deadline: ${new Date(project.deadline).toDateString()}` : "As agreed upon project start"),
    budget: String(project.budget),
    milestoneBreakdown: body.milestoneBreakdown ?? null,
    revisionPolicy: body.revisionPolicy ?? "Up to 2 free revisions per milestone. Additional revisions billed at hourly rate.",
    refundPolicy: body.refundPolicy ?? "Full refund if work not started. 50% refund if milestone not yet submitted. No refund after final approval.",
    paymentTerms: body.paymentTerms ?? "Payments released milestone-by-milestone from Smart Escrow upon client approval.",
    status: "draft",
  }).returning();

  await db.insert(notificationsTable).values({
    userId: project.freelancerId,
    type: "contract",
    title: "Contract ready for review",
    body: `A contract has been generated for project "${project.title}". Please review and sign.`,
    link: `/projects/${projectId}`,
  });

  await db.insert(activityLogsTable).values({
    projectId,
    userId: req.userId!,
    action: "contract_generated",
    details: `Contract generated for project "${project.title}"`,
    entityType: "contract",
    entityId: contract?.id,
  });

  res.status(201).json(contract ? { ...contract, budget: Number(contract.budget) } : null);
});

router.patch("/projects/:id/contract/sign", requireAuth, async (req, res) => {
  const projectId = parseInt(String(req.params.id));
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const contract = await db.query.contractsTable.findFirst({ where: eq(contractsTable.projectId, projectId) });
  if (!contract) { res.status(404).json({ error: "Contract not found" }); return; }

  const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, projectId) });
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const isClient = req.userId === project.clientId;
  const isFreelancer = req.userId === project.freelancerId;
  if (!isClient && !isFreelancer) { res.status(403).json({ error: "Forbidden" }); return; }

  const updateData: Record<string, unknown> = {};
  if (isClient && !contract.clientSignedAt) updateData.clientSignedAt = new Date();
  if (isFreelancer && !contract.freelancerSignedAt) updateData.freelancerSignedAt = new Date();

  // Both signed → activate contract
  const newClientSigned = isClient ? new Date() : contract.clientSignedAt;
  const newFreelancerSigned = isFreelancer ? new Date() : contract.freelancerSignedAt;
  if (newClientSigned && newFreelancerSigned) updateData.status = "active";

  const [updated] = await db.update(contractsTable).set(updateData).where(eq(contractsTable.id, contract.id)).returning();

  await db.insert(activityLogsTable).values({
    projectId,
    userId: req.userId!,
    action: isClient ? "contract_signed_client" : "contract_signed_freelancer",
    details: `${isClient ? "Client" : "Freelancer"} signed the contract`,
    entityType: "contract",
    entityId: contract.id,
  });

  const otherUserId = isClient ? project.freelancerId : project.clientId;
  await db.insert(notificationsTable).values({
    userId: otherUserId,
    type: "contract",
    title: `Contract signed by ${isClient ? "client" : "freelancer"}`,
    body: updated?.status === "active" ? "Both parties have signed. The contract is now active!" : `The ${isClient ? "client" : "freelancer"} has signed the contract. Awaiting your signature.`,
    link: `/projects/${projectId}`,
  });

  res.json(updated ? { ...updated, budget: Number(updated.budget) } : null);
});

export default router;
