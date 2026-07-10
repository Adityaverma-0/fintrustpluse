import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { walletsTable } from "./wallets";
import { bankAccountsTable } from "./bank_accounts";

export const withdrawalRequestsTable = pgTable("withdrawal_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  walletId: integer("wallet_id").notNull().references(() => walletsTable.id),
  bankAccountId: integer("bank_account_id").notNull().references(() => bankAccountsTable.id),
  amount: numeric("amount").notNull(),
  currency: text("currency").notNull().default("INR"),
  payoutProvider: text("payout_provider").notNull().default("razorpayx"), // 'razorpayx' | 'mock'
  payoutId: text("payout_id"),
  status: text("status").notNull().default("pending"), // 'pending' | 'processing' | 'successful' | 'failed' | 'cancelled' | 'reversed' | 'rejected'
  failureReason: text("failure_reason"),
  adminNotes: text("admin_notes"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  approvedAt: timestamp("approved_at"),
  processedAt: timestamp("processed_at"),
});

export type WithdrawalRequest = typeof withdrawalRequestsTable.$inferSelect;
export type NewWithdrawalRequest = typeof withdrawalRequestsTable.$inferInsert;
