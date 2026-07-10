import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { jobsTable } from "./jobs";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobsTable.id),
  clientId: integer("client_id").notNull().references(() => usersTable.id),
  freelancerId: integer("freelancer_id").notNull().references(() => usersTable.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("active"),
  budget: numeric("budget").notNull(),
  commissionRate: numeric("commission_rate").notNull().default("10.00"),
  deadline: timestamp("deadline"),
  proposalId: integer("proposal_id"),
  contractId: integer("contract_id"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Project = typeof projectsTable.$inferSelect;
