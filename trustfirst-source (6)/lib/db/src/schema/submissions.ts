import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { projectsTable } from "./projects";
import { milestonesTable } from "./milestones";

export const submissionsTable = pgTable("submissions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id),
  milestoneId: integer("milestone_id").references(() => milestonesTable.id),
  freelancerId: integer("freelancer_id").notNull().references(() => usersTable.id),
  description: text("description").notNull(),
  files: text("files"),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("submitted"),
  clientFeedback: text("client_feedback"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Submission = typeof submissionsTable.$inferSelect;
