import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { jobsTable } from "./jobs";

export const proposalsTable = pgTable("proposals", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobsTable.id),
  freelancerId: integer("freelancer_id").notNull().references(() => usersTable.id),
  coverLetter: text("cover_letter").notNull(),
  bidAmount: numeric("bid_amount").notNull(),
  deliveryDays: integer("delivery_days").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Proposal = typeof proposalsTable.$inferSelect;
