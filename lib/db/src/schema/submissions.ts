import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { milestonesTable } from "./milestones";
import { usersTable } from "./users";

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

export const milestoneSubmissionsTable = pgTable("milestone_submissions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id),
  milestoneId: integer("milestone_id").notNull().references(() => milestonesTable.id),
  title: text("title").notNull(),
  description: text("description"),
  workSummary: text("work_summary"),
  completionNotes: text("completion_notes"),
  technologiesUsed: text("technologies_used"),
  revisionNotes: text("revision_notes"),
  timeSpent: integer("time_spent"),
  projectVersion: text("project_version").notNull().default("1.0.0"),
  githubRepo: text("github_repo"),
  liveDemoUrl: text("live_demo_url"),
  figmaLink: text("figma_link"),
  status: text("status").notNull().default("submitted"), // submitted, under_review, revision_requested, approved, rejected, released
  rating: integer("rating"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const submissionFilesTable = pgTable("submission_files", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => milestoneSubmissionsTable.id),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  fileUrl: text("file_url").notNull(),
  fileHash: text("file_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const submissionCommentsTable = pgTable("submission_comments", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => milestoneSubmissionsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  comment: text("comment").notNull(),
  rating: integer("rating"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MilestoneSubmission = typeof milestoneSubmissionsTable.$inferSelect;
export type SubmissionFile = typeof submissionFilesTable.$inferSelect;
export type SubmissionComment = typeof submissionCommentsTable.$inferSelect;
export type Submission = typeof submissionsTable.$inferSelect;
