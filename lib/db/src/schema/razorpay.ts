import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const razorpayOrdersTable = pgTable("razorpay_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  razorpayOrderId: text("razorpay_order_id").notNull().unique(),
  amount: numeric("amount").notNull(), // amount in USD
  currency: text("currency").notNull().default("USD"),
  razorpayAmount: integer("razorpay_amount").notNull(), // amount in paise (INR)
  razorpayCurrency: text("razorpay_currency").notNull().default("INR"),
  status: text("status").notNull().default("created"), // 'created', 'paid', 'failed'
  razorpayPaymentId: text("razorpay_payment_id"),
  razorpaySignature: text("razorpay_signature"),
  type: text("type").notNull(), // 'wallet_deposit' | 'escrow_funding'
  referenceId: integer("reference_id"), // project ID for escrow_funding
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type RazorpayOrder = typeof razorpayOrdersTable.$inferSelect;
export type NewRazorpayOrder = typeof razorpayOrdersTable.$inferInsert;
