import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { projectsTable } from "./projects";

export const contractsTable = pgTable("contracts", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().unique().references(() => projectsTable.id),
  clientId: integer("client_id").notNull().references(() => usersTable.id),
  freelancerId: integer("freelancer_id").notNull().references(() => usersTable.id),
  scope: text("scope").notNull(),
  deliverables: text("deliverables").notNull(),
  timeline: text("timeline").notNull(),
  budget: numeric("budget").notNull(),
  milestoneBreakdown: text("milestone_breakdown"),
  revisionPolicy: text("revision_policy").notNull().default("Up to 2 free revisions per milestone. Additional revisions billed at hourly rate."),
  refundPolicy: text("refund_policy").notNull().default("Full refund if work not started. 50% refund if milestone not yet submitted. No refund after final approval."),
  paymentTerms: text("payment_terms").notNull().default("Payments released milestone-by-milestone from Smart Escrow upon client approval."),
  status: text("status").notNull().default("draft"),
  clientSignedAt: timestamp("client_signed_at"),
  freelancerSignedAt: timestamp("freelancer_signed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Contract = typeof contractsTable.$inferSelect;
