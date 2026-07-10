import { db, invoicesTable, walletsTable, walletTransactionsTable, projectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateInvoiceForEvent } from "./lib/invoices";

async function seedHistorical() {
  console.log("=== Seeding Historical Invoices ===");

  // Fetch all transactions
  const txs = await db.select().from(walletTransactionsTable);
  console.log(`Fetched ${txs.length} transactions from the database.`);

  for (const tx of txs) {
    // Check if an invoice already exists for this transaction
    const existing = await db.query.invoicesTable.findFirst({
      where: eq(invoicesTable.transactionId, tx.id)
    });

    if (existing) {
      console.log(`Invoice already exists for transaction #${tx.id}. Skipping.`);
      continue;
    }

    const amount = Number(tx.amount);
    if (amount <= 0) continue;

    // Get wallet owner
    const wallet = await db.query.walletsTable.findFirst({
      where: eq(walletsTable.id, tx.walletId)
    });
    if (!wallet) continue;

    const txUserId = wallet.userId;

    let invoiceType: any = null;
    let clientId = txUserId;
    let freelancerId: number | undefined = undefined;
    let projectId: number | undefined = undefined;

    // Classify transaction
    if (tx.type === "escrow_hold") {
      invoiceType = "escrow_deposit";
      clientId = 6; // Sanket
      freelancerId = 5; // Prem
      projectId = tx.referenceId ? Number(tx.referenceId) : undefined;
    } else if (tx.type === "escrow_release") {
      invoiceType = "milestone_release";
      clientId = 6; // Sanket
      freelancerId = 5; // Prem
      projectId = tx.referenceId ? Number(tx.referenceId) : undefined;
    } else if (tx.type === "credit" && tx.description.includes("Deposit")) {
      invoiceType = "wallet_deposit";
      clientId = txUserId;
    } else if (tx.type === "debit" && tx.description.includes("Withdrawal")) {
      invoiceType = "withdrawal";
      clientId = txUserId;
    } else if (tx.type === "credit" && tx.description.includes("Payment received")) {
      // This is the credit leg of a milestone release.
      // We already process it via the client's escrow_release leg. Skip to avoid duplicates.
      console.log(`Transaction #${tx.id} is a milestone credit leg. Skipping to avoid duplicate.`);
      continue;
    }

    if (!invoiceType) {
      console.log(`Transaction #${tx.id} (${tx.type}) has unclassified invoice type. Skipping.`);
      continue;
    }

    console.log(`Generating invoice for transaction #${tx.id} (Type: ${invoiceType}, Amount: $${amount})...`);
    try {
      const inv = await generateInvoiceForEvent(
        invoiceType,
        amount,
        clientId,
        freelancerId,
        {
          projectId,
          transactionId: tx.id,
          paymentMethod: tx.type === "escrow_hold" || tx.type === "escrow_release" ? "Smart Escrow" : "Bank Transfer"
        }
      );
      console.log(`Generated invoice ${inv.invoiceNumber} (ID: ${inv.id})`);
    } catch (err: any) {
      console.error(`Failed to generate invoice for transaction #${tx.id}:`, err.message);
    }
  }

  console.log("=== Seeding Historical Invoices Complete ===");
}

seedHistorical().catch((err) => {
  console.error("Historical seeding failed:", err);
  process.exit(1);
});
