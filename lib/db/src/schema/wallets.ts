import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const walletsTable = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id),
  availableBalance: numeric("available_balance").notNull().default("0"),
  escrowBalance: numeric("escrow_balance").notNull().default("0"),
  totalEarned: numeric("total_earned").notNull().default("0"),
  totalSpent: numeric("total_spent").notNull().default("0"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const walletTransactionsTable = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").notNull().references(() => walletsTable.id),
  type: text("type").notNull(),
  amount: numeric("amount").notNull(),
  description: text("description").notNull(),
  referenceId: integer("reference_id"),
  referenceType: text("reference_type"),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Wallet = typeof walletsTable.$inferSelect;
export type WalletTransaction = typeof walletTransactionsTable.$inferSelect;
