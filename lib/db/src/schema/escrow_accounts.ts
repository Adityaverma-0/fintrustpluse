import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const escrowAccountsTable = pgTable("escrow_accounts", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().unique().references(() => projectsTable.id),
  clientId: integer("client_id").notNull().references(() => usersTable.id),
  freelancerId: integer("freelancer_id").notNull().references(() => usersTable.id),
  totalAmount: numeric("total_amount").notNull().default("0"),
  releasedAmount: numeric("released_amount").notNull().default("0"),
  refundedAmount: numeric("refunded_amount").notNull().default("0"),
  status: text("status").notNull().default("pending"),
  fundedAt: timestamp("funded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EscrowAccount = typeof escrowAccountsTable.$inferSelect;
