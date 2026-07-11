import { db } from "@workspace/db";
import {
  invoicesTable,
  invoiceItemsTable,
  invoiceTaxesTable,
  invoicePaymentsTable,
  paymentReceiptsTable,
  settlementReportsTable,
  gstProfilesTable,
  taxConfigurationsTable,
  usersTable,
  projectsTable,
  milestonesTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";

// Generate unique invoice number: INV-YYYYMMDD-XXXX
export function generateInvoiceNumber(type: string = "INV"): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${type}-${dateStr}-${rand}`;
}

interface GenerateInvoiceOptions {
  projectId?: number;
  contractId?: number;
  escrowAccountId?: number;
  milestoneId?: number;
  transactionId?: number;
  paymentMethod?: string;
  tx?: any; // optional transaction instance
}

export async function generateInvoiceForEvent(
  type: "escrow_deposit" | "milestone_release" | "refund" | "withdrawal" | "wallet_deposit" | "platform_fee",
  amount: number,
  clientId: number,
  freelancerId?: number,
  options: GenerateInvoiceOptions = {}
) {
  const runner = options.tx || db;

  // 1. Fetch user records
  const client = await runner.query.usersTable.findFirst({ where: eq(usersTable.id, clientId) });
  if (!client) throw new Error("Client not found for invoice generation");

  const freelancer = freelancerId
    ? await runner.query.usersTable.findFirst({ where: eq(usersTable.id, freelancerId) })
    : null;

  // 2. Fetch GST profiles
  let clientGst = await runner.query.gstProfilesTable.findFirst({ where: eq(gstProfilesTable.userId, clientId) });
  let freelancerGst = freelancerId
    ? await runner.query.gstProfilesTable.findFirst({ where: eq(gstProfilesTable.userId, freelancerId) })
    : null;

  // 3. Fetch tax configurations
  let taxConfig = await runner.query.taxConfigurationsTable.findFirst({
    order: [desc(taxConfigurationsTable.id)],
  });
  if (!taxConfig) {
    // Seed fallback
    const [fallback] = await runner.insert(taxConfigurationsTable).values({}).returning();
    taxConfig = fallback!;
  }

  // 4. Fetch project details if available
  let projectTitle = "Wallet Transaction";
  let projectDesc = "General funds transfer";
  let projectCommissionRate: number | undefined;
  if (options.projectId) {
    const project = await runner.query.projectsTable.findFirst({ where: eq(projectsTable.id, options.projectId) });
    if (project) {
      projectTitle = project.title;
      projectDesc = project.description || "";
      projectCommissionRate = Number(project.commissionRate);
    }
  }

  // 5. Fetch milestone details if available
  let milestoneTitle = "General Release";
  if (options.milestoneId) {
    const milestone = await runner.query.milestonesTable.findFirst({ where: eq(milestonesTable.id, options.milestoneId) });
    if (milestone) {
      milestoneTitle = milestone.title;
    }
  }

  // 6. Tax calculations
  let subtotal = amount;
  let platformFee = 0;
  let gst = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let tds = 0;
  let total = amount;

  const commissionRate = projectCommissionRate !== undefined ? projectCommissionRate : Number(taxConfig.platformCommissionRate);
  const commissionGstRate = Number(taxConfig.gstOnCommissionRate); // 18%
  const cgstRate = Number(taxConfig.cgstRate); // 9%
  const sgstRate = Number(taxConfig.sgstRate); // 9%
  const igstRate = Number(taxConfig.igstRate); // 18%
  const tdsRate = Number(taxConfig.tdsRate); // 1%

  // Check GST locations
  const isFreelancerRegistered = freelancerGst?.isRegistered ?? false;
  const clientState = clientGst?.state || "Unknown";
  const freelancerState = freelancerGst?.state || "Unknown";

  if (type === "milestone_release") {
    // Platform fee calculation
    platformFee = subtotal * (commissionRate / 100);
    
    // Freelancer service GST (if freelancer is GST registered, they charge client GST)
    if (isFreelancerRegistered) {
      if (clientState !== "Unknown" && freelancerState !== "Unknown" && clientState === freelancerState) {
        cgst = subtotal * (cgstRate / 100);
        sgst = subtotal * (sgstRate / 100);
        gst = cgst + sgst;
      } else {
        igst = subtotal * (igstRate / 100);
        gst = igst;
      }
    }
    
    // Platform service fee GST deduction (charged to freelancer's commission fee)
    const platformFeeGst = platformFee * (commissionGstRate / 100);
    
    // Optional TDS deduction (1% of subtotal)
    tds = subtotal * (tdsRate / 100);

    total = subtotal + gst;
  } else if (type === "escrow_deposit") {
    // On escrow deposit, subtotal is total locked amount
    total = subtotal;
  } else if (type === "platform_fee") {
    platformFee = subtotal;
    // GST on platform fee
    cgst = platformFee * (cgstRate / 100);
    sgst = platformFee * (sgstRate / 100);
    gst = cgst + sgst;
    total = platformFee + gst;
  }

  // 7. Insert Invoice Record
  const invoiceNumber = generateInvoiceNumber("INV");
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 15); // Net 15 terms

  const [invoice] = await runner.insert(invoicesTable).values({
    invoiceNumber,
    projectId: options.projectId ?? null,
    contractId: options.contractId ?? null,
    escrowAccountId: options.escrowAccountId ?? null,
    milestoneId: options.milestoneId ?? null,
    clientId,
    freelancerId: freelancerId ?? null,
    type,
    
    clientName: clientGst?.companyName || client.name,
    clientCompany: clientGst?.companyName || null,
    clientAddress: clientGst?.billingAddress || "Billing address not configured",
    clientGstin: clientGst?.gstin || null,
    freelancerName: freelancer ? (freelancerGst?.companyName || freelancer.name) : null,
    freelancerGstin: freelancerGst?.gstin || null,
    projectTitle,
    description: projectDesc,

    subtotalAmount: String(subtotal),
    platformFee: String(platformFee),
    gstAmount: String(gst),
    cgstAmount: String(cgst),
    sgstAmount: String(sgst),
    igstAmount: String(igst),
    tdsAmount: String(tds),
    processingFee: "0.00",
    discount: "0.00",
    totalAmount: String(total),

    paymentMethod: options.paymentMethod || "Wallet",
    transactionId: options.transactionId ?? null,
    status: type === "escrow_deposit" || type === "withdrawal" || type === "refund" ? "paid" : "generated",
    
    digitalSignature: "FinTrust+ Secure Cryptographic Seal",
    qrCode: `https://fintrustplus.com/verify-invoice/${invoiceNumber}`,
    dueDate,
  }).returning();

  // 8. Insert Invoice Items
  let itemDescription = `Payment for project "${projectTitle}"`;
  if (type === "milestone_release") {
    itemDescription = `Milestone deliverable release: "${milestoneTitle}"`;
  } else if (type === "escrow_deposit") {
    itemDescription = `Escrow funding deposit lock for "${projectTitle}"`;
  } else if (type === "withdrawal") {
    itemDescription = `Wallet funds withdrawal transfer`;
  } else if (type === "wallet_deposit") {
    itemDescription = `Wallet credit mockup deposit`;
  } else if (type === "refund") {
    itemDescription = `Escrow contract refund returned to client`;
  }

  await runner.insert(invoiceItemsTable).values({
    invoiceId: invoice.id,
    description: itemDescription,
    quantity: 1,
    unitPrice: String(subtotal),
    totalPrice: String(subtotal),
  });

  // 9. Insert Invoice Taxes
  if (gst > 0) {
    if (cgst > 0) {
      await runner.insert(invoiceTaxesTable).values({
        invoiceId: invoice.id,
        taxType: "cgst",
        taxRate: String(cgstRate),
        taxAmount: String(cgst),
      });
      await runner.insert(invoiceTaxesTable).values({
        invoiceId: invoice.id,
        taxType: "sgst",
        taxRate: String(sgstRate),
        taxAmount: String(sgst),
      });
    } else {
      await runner.insert(invoiceTaxesTable).values({
        invoiceId: invoice.id,
        taxType: "igst",
        taxRate: String(igstRate),
        taxAmount: String(igst),
      });
    }
  }
  
  if (platformFee > 0) {
    await runner.insert(invoiceTaxesTable).values({
      invoiceId: invoice.id,
      taxType: "platform_gst",
      taxRate: String(commissionGstRate),
      taxAmount: String(platformFee * (commissionGstRate / 100)),
    });
  }

  // 10. Generate Receipt
  if (options.transactionId) {
    const receiptNumber = generateInvoiceNumber("REC");
    await runner.insert(paymentReceiptsTable).values({
      receiptNumber,
      invoiceId: invoice.id,
      walletTransactionId: options.transactionId,
      amount: String(total),
      type,
      payerName: clientGst?.companyName || client.name,
      recipientName: freelancer ? (freelancerGst?.companyName || freelancer.name) : "Platform Admin",
    });
  }

  // 11. Generate Freelancer Settlement Report (If release)
  if (type === "milestone_release" && freelancerId) {
    const commissionGst = platformFee * (commissionGstRate / 100);
    const netEarnings = subtotal - platformFee - commissionGst - tds;
    const period = new Date().toISOString().slice(0, 7); // e.g. "2026-07"

    await runner.insert(settlementReportsTable).values({
      freelancerId,
      grossEarnings: String(subtotal),
      platformFee: String(platformFee),
      gstDeduction: String(commissionGst),
      tdsDeduction: String(tds),
      netEarnings: String(netEarnings),
      reportPeriod: period,
    });
  }

  return invoice;
}
