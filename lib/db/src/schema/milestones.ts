import { pgTable, serial, text, integer, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const milestonesTable = pgTable("milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id),
  title: text("title").notNull(),
  description: text("description"),
  amount: numeric("amount").notNull(),
  percentage: numeric("percentage").notNull().default("0.00"),
  status: text("status").notNull().default("pending"),
  dueDate: timestamp("due_date"),
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  deliverables: text("deliverables"),
  clientFeedback: text("client_feedback"),
  order: integer("order").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const milestoneTemplatesTable = pgTable("milestone_templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  name: text("name").notNull(),
  structure: jsonb("structure").notNull(), // array of { title, description, percentage, deliverables }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Milestone = typeof milestonesTable.$inferSelect;
export type MilestoneTemplate = typeof milestoneTemplatesTable.$inferSelect;
