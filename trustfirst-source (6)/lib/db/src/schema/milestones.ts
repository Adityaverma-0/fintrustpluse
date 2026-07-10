import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const milestonesTable = pgTable("milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id),
  title: text("title").notNull(),
  description: text("description"),
  amount: numeric("amount").notNull(),
  status: text("status").notNull().default("pending"),
  dueDate: timestamp("due_date"),
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  deliverables: text("deliverables"),
  clientFeedback: text("client_feedback"),
  order: integer("order").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Milestone = typeof milestonesTable.$inferSelect;
