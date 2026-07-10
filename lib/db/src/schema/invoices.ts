import { pgTable, serial, integer, numeric, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { projectsTable } from "./projects";
import { contractsTable } from "./contracts";
import { escrowAccountsTable } from "./escrow_accounts";
import { milestonesTable } from "./milestones";
import { walletTransactionsTable } from "./wallets";

// User GST profile information
export const gstProfilesTable = pgTable("gst_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id),
  companyName: text("company_name"),
  billingAddress: text("billing_address"),
  gstin: text("gstin"),
  isRegistered: boolean("is_registered").notNull().default(false),
  state: text("state"), // e.g. "Maharashtra", "Delhi" to evaluate CGST/SGST vs IGST
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tax rates config
export const taxConfigurationsTable = pgTable("tax_configurations", {
  id: serial("id").primaryKey(),
  platformCommissionRate: numeric("platform_commission_rate").notNull().default("5.00"), // 5%
  gstOnCommissionRate: numeric("gst_on_commission_rate").notNull().default("18.00"), // 18%
  cgstRate: numeric("cgst_rate").notNull().default("9.00"), // 9%
  sgstRate: numeric("sgst_rate").notNull().default("9.00"), // 9%
  igstRate: numeric("igst_rate").notNull().default("18.00"), // 18%
  tdsRate: numeric("tds_rate").notNull().default("1.00"), // 1%
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Main invoices table
export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(), // e.g. INV-YYYYMMDD-XXXX
  projectId: integer("project_id").references(() => projectsTable.id),
  contractId: integer("contract_id").references(() => contractsTable.id),
  escrowAccountId: integer("escrow_account_id").references(() => escrowAccountsTable.id),
  milestoneId: integer("milestone_id").references(() => milestonesTable.id),
  clientId: integer("client_id").notNull().references(() => usersTable.id),
  freelancerId: integer("freelancer_id").references(() => usersTable.id),
  type: text("type").notNull(), // escrow_deposit, milestone_release, refund, withdrawal, platform_fee, wallet_deposit
  
  // Billing details snapshot at invoice generation time
  clientName: text("client_name").notNull(),
  clientCompany: text("client_company"),
  clientAddress: text("client_address"),
  clientGstin: text("client_gstin"),
  freelancerName: text("freelancer_name"),
  freelancerGstin: text("freelancer_gstin"),
  projectTitle: text("project_title"),
  description: text("description"),

  // Financial values
  subtotalAmount: numeric("subtotal_amount").notNull(),
  platformFee: numeric("platform_fee").notNull().default("0.00"),
  gstAmount: numeric("gst_amount").notNull().default("0.00"),
  cgstAmount: numeric("cgst_amount").notNull().default("0.00"),
  sgstAmount: numeric("sgst_amount").notNull().default("0.00"),
  igstAmount: numeric("igst_amount").notNull().default("0.00"),
  tdsAmount: numeric("tds_amount").notNull().default("0.00"),
  processingFee: numeric("processing_fee").notNull().default("0.00"),
  discount: numeric("discount").notNull().default("0.00"),
  totalAmount: numeric("total_amount").notNull(),

  paymentMethod: text("payment_method").notNull().default("Wallet"),
  transactionId: integer("transaction_id"), // references wallet_transactions.id
  status: text("status").notNull().default("generated"), // draft, generated, paid, pending, refunded, cancelled, archived
  
  digitalSignature: text("digital_signature"),
  qrCode: text("qr_code"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Detailed list items in an invoice
export const invoiceItemsTable = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoicesTable.id),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price").notNull(),
  totalPrice: numeric("total_price").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Calculated taxes details per invoice
export const invoiceTaxesTable = pgTable("invoice_taxes", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoicesTable.id),
  taxType: text("tax_type").notNull(), // cgst, sgst, igst, platform_gst, tds
  taxRate: numeric("tax_rate").notNull(),
  taxAmount: numeric("tax_amount").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Payments made towards invoices
export const invoicePaymentsTable = pgTable("invoice_payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoicesTable.id),
  paymentMethod: text("payment_method").notNull(),
  amount: numeric("amount").notNull(),
  transactionReference: text("transaction_reference"),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Payment receipts
export const paymentReceiptsTable = pgTable("payment_receipts", {
  id: serial("id").primaryKey(),
  receiptNumber: text("receipt_number").notNull().unique(), // REC-YYYYMMDD-XXXX
  invoiceId: integer("invoice_id").references(() => invoicesTable.id),
  walletTransactionId: integer("wallet_transaction_id").notNull().references(() => walletTransactionsTable.id),
  amount: numeric("amount").notNull(),
  type: text("type").notNull(), // escrow_deposit, milestone_release, refund, withdrawal, wallet_deposit
  payerName: text("payer_name").notNull(),
  recipientName: text("recipient_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Settlement reports for freelancer earnings
export const settlementReportsTable = pgTable("settlement_reports", {
  id: serial("id").primaryKey(),
  freelancerId: integer("freelancer_id").notNull().references(() => usersTable.id),
  grossEarnings: numeric("gross_earnings").notNull(),
  platformFee: numeric("platform_fee").notNull(),
  gstDeduction: numeric("gst_deduction").notNull(),
  tdsDeduction: numeric("tds_deduction").notNull(),
  netEarnings: numeric("net_earnings").notNull(),
  reportPeriod: text("report_period").notNull(), // e.g. "2026-07"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
