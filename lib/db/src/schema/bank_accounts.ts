import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const bankAccountsTable = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  accountHolderName: text("account_holder_name").notNull(),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(), // encrypted at rest
  ifscCode: text("ifsc_code").notNull(),
  upiId: text("upi_id"),
  pan: text("pan"),
  gst: text("gst"),
  isVerified: boolean("is_verified").notNull().default(false),
  contactId: text("contact_id"),
  fundAccountId: text("fund_account_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BankAccount = typeof bankAccountsTable.$inferSelect;
export type NewBankAccount = typeof bankAccountsTable.$inferInsert;
