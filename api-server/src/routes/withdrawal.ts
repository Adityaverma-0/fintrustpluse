import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { 
  db, 
  walletsTable, 
  walletTransactionsTable, 
  bankAccountsTable, 
  withdrawalRequestsTable, 
  usersTable,
  notificationsTable,
  invoicesTable
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { z } from "zod";
import { encrypt, decrypt } from "../lib/encryption";
import { createContactAndFundAccount, createPayout, getPayoutStatus } from "../lib/payouts";
import { generateInvoiceForEvent } from "../lib/invoices";

const router: IRouter = Router();

// Helper to get or create wallet
async function getOrCreateWallet(userId: number) {
  let wallet = await db.query.walletsTable.findFirst({ where: eq(walletsTable.userId, userId) });
  if (!wallet) {
    const [created] = await db.insert(walletsTable).values({ userId }).returning();
    wallet = created!;
  }
  return wallet;
}

// Mask sensitive bank account number
function maskAccountNumber(accNum: string): string {
  const decrypted = decrypt(accNum);
  if (decrypted.length <= 4) return decrypted;
  return "*".repeat(decrypted.length - 4) + decrypted.slice(-4);
}

// ==========================================
// Freelancer Endpoints
// ==========================================

// GET /api/wallet/balance
router.get("/wallet/balance", requireAuth, async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.userId!);
    
    // Calculate pending withdrawals
    const pendingWithdrawals = await db.query.withdrawalRequestsTable.findMany({
      where: and(
        eq(withdrawalRequestsTable.userId, req.userId!),
        eq(withdrawalRequestsTable.status, "pending")
      )
    });
    const pendingSum = pendingWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);

    // Calculate total withdrawn
    const successfulWithdrawals = await db.query.withdrawalRequestsTable.findMany({
      where: and(
        eq(withdrawalRequestsTable.userId, req.userId!),
        eq(withdrawalRequestsTable.status, "successful")
      )
    });
    const totalWithdrawn = successfulWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);

    // Find last withdrawal
    const lastWithdrawal = await db.query.withdrawalRequestsTable.findFirst({
      where: eq(withdrawalRequestsTable.userId, req.userId!),
      orderBy: [desc(withdrawalRequestsTable.requestedAt)]
    });

    res.json({
      availableBalance: Number(wallet.availableBalance),
      pendingBalance: pendingSum,
      lockedEscrowBalance: Number(wallet.escrowBalance),
      totalEarnings: Number(wallet.totalEarned),
      totalWithdrawn,
      lastWithdrawal: lastWithdrawal ? {
        amount: Number(lastWithdrawal.amount),
        status: lastWithdrawal.status,
        requestedAt: lastWithdrawal.requestedAt
      } : null
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/wallet/withdrawals
router.get("/wallet/withdrawals", requireAuth, async (req, res) => {
  try {
    const list = await db.query.withdrawalRequestsTable.findMany({
      where: eq(withdrawalRequestsTable.userId, req.userId!),
      orderBy: [desc(withdrawalRequestsTable.requestedAt)]
    });
    res.json(list.map(w => ({ ...w, amount: Number(w.amount) })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/wallet/withdraw
router.post("/wallet/withdraw", requireAuth, async (req, res) => {
  const parsed = z.object({
    amount: z.number().positive(),
    bankAccountId: z.number(),
    payoutMethod: z.enum(["razorpayx", "razorpay_instant"]).default("razorpayx"),
    otp: z.string().length(6),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }

  const { amount, bankAccountId, payoutMethod, otp } = parsed.data;

  try {
    // 1. Validate user role & KYC status & OTP
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.userId!) });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.role !== "freelancer") {
      res.status(403).json({ error: "Only freelancers can withdraw funds" });
      return;
    }

    if (!user.isVerified) {
      res.status(400).json({ error: "KYC verification is required before initiating withdrawals" });
      return;
    }

    if (!user.withdrawalOtp || !user.withdrawalOtpExpiry || new Date() > user.withdrawalOtpExpiry) {
      res.status(400).json({ error: "Verification code expired. Please request a new code." });
      return;
    }

    if (user.withdrawalOtp !== otp.trim()) {
      res.status(400).json({ error: "Invalid verification code." });
      return;
    }

    // 2. Validate bank account is linked and verified
    const bank = await db.query.bankAccountsTable.findFirst({
      where: and(
        eq(bankAccountsTable.id, bankAccountId),
        eq(bankAccountsTable.userId, req.userId!)
      )
    });

    if (!bank) {
      res.status(404).json({ error: "Linked bank account not found" });
      return;
    }

    if (!bank.isVerified) {
      res.status(400).json({ error: "Bank account is not verified yet" });
      return;
    }

    // 3. Configurable minimum withdrawal amount
    const MINIMUM_WITHDRAWAL_USD = 10;
    if (amount < MINIMUM_WITHDRAWAL_USD) {
      res.status(400).json({ error: `Minimum withdrawal amount is $${MINIMUM_WITHDRAWAL_USD}` });
      return;
    }

    // 4. Duplicate request prevention (check for active requests)
    const activeRequest = await db.query.withdrawalRequestsTable.findFirst({
      where: and(
        eq(withdrawalRequestsTable.userId, req.userId!),
        eq(withdrawalRequestsTable.status, "pending")
      )
    });
    if (activeRequest) {
      res.status(400).json({ error: "You already have an active pending withdrawal request" });
      return;
    }

    // 5. Check wallet available balance
    const wallet = await getOrCreateWallet(req.userId!);
    if (Number(wallet.availableBalance) < amount) {
      res.status(400).json({ error: "Insufficient available balance" });
      return;
    }

    // 6. Complete creation under transaction
    const result = await db.transaction(async (tx) => {
      // Hold funds: deduct from available balance
      const newBalance = Number(wallet.availableBalance) - amount;
      await tx.update(walletsTable)
        .set({ availableBalance: String(newBalance) })
        .where(eq(walletsTable.id, wallet.id));

      // Clear the withdrawal OTP so it cannot be reused
      await tx.update(usersTable)
        .set({ withdrawalOtp: null, withdrawalOtpExpiry: null })
        .where(eq(usersTable.id, req.userId!));

      const [request] = await tx.insert(withdrawalRequestsTable).values({
        userId: req.userId!,
        walletId: wallet.id,
        bankAccountId: bank.id,
        amount: String(amount),
        currency: "USD",
        status: payoutMethod === "razorpay_instant" ? "processing" : "pending",
        payoutProvider: payoutMethod === "razorpay_instant" ? "razorpay" : "manual",
      }).returning();

      return request;
    });

    if (payoutMethod === "razorpay_instant") {
      try {
        // Sync contact and fund account if not present
        let contactId = bank.contactId;
        let fundAccountId = bank.fundAccountId;
        if (!contactId || !fundAccountId) {
          const links = await createContactAndFundAccount(
            { id: user.id, name: user.name, email: user.email },
            bank
          );
          contactId = links.contactId;
          fundAccountId = links.fundAccountId;
          await db.update(bankAccountsTable)
            .set({ contactId, fundAccountId })
            .where(eq(bankAccountsTable.id, bank.id));
        }

        // Trigger Payout
        const payoutResult = await createPayout(fundAccountId!, amount, `payout_inst_${result.id}`);

        // If mock, resolve status instantly
        let finalStatus = payoutResult.status;
        let failureReason = payoutResult.failureReason;
        if (finalStatus === "processing") {
          const check = await getPayoutStatus(payoutResult.payoutId);
          finalStatus = check.status;
          failureReason = check.failureReason;
        }

        if (finalStatus === "successful") {
          // Update request to successful
          await db.update(withdrawalRequestsTable)
            .set({
              status: "successful",
              payoutId: payoutResult.payoutId,
              processedAt: new Date(),
            })
            .where(eq(withdrawalRequestsTable.id, result.id));

          // Insert withdrawal wallet transaction
          await db.transaction(async (tx) => {
            const [txRecord] = await tx.insert(walletTransactionsTable).values({
              walletId: wallet.id,
              type: "debit",
              amount: String(amount),
              description: `Instant Payout Transfer successfully processed (Payout ID: ${payoutResult.payoutId})`,
              referenceId: result.id,
              referenceType: "withdrawal",
              status: "completed",
            }).returning();

            try {
              await generateInvoiceForEvent("withdrawal", amount, req.userId!, undefined, {
                transactionId: txRecord.id,
                tx
              });
            } catch (invoiceErr: any) {
              console.error("[Withdrawal Invoice Error]", invoiceErr);
            }
          });

          // Notify freelancer
          await db.insert(notificationsTable).values({
            userId: req.userId!,
            type: "withdrawal_processed",
            title: "Instant Withdrawal Successful",
            body: `Your instant withdrawal of $${amount} has been successfully processed.`,
            link: "/withdraw",
          });

          res.status(201).json({
            ...result,
            status: "successful",
            payoutId: payoutResult.payoutId,
            amount: amount,
          });
          return;
        } else if (finalStatus === "failed" || finalStatus === "rejected") {
          throw new Error(failureReason || "Instant Payout Transfer failed");
        } else {
          // Keep as processing (webhook / status pull will resolve it)
          await db.update(withdrawalRequestsTable)
            .set({
              payoutId: payoutResult.payoutId,
            })
            .where(eq(withdrawalRequestsTable.id, result.id));

          res.status(201).json({
            ...result,
            status: "processing",
            payoutId: payoutResult.payoutId,
            amount: amount,
          });
          return;
        }
      } catch (payoutErr: any) {
        // Revert transaction: return money to wallet
        const currentWallet = await getOrCreateWallet(req.userId!);
        const revertedBalance = Number(currentWallet.availableBalance) + amount;
        await db.update(walletsTable)
          .set({ availableBalance: String(revertedBalance) })
          .where(eq(walletsTable.id, wallet.id));

        // Mark request as failed
        await db.update(withdrawalRequestsTable)
          .set({
            status: "failed",
            failureReason: payoutErr.message || "Instant Payout failed",
            processedAt: new Date(),
          })
          .where(eq(withdrawalRequestsTable.id, result.id));

        res.status(400).json({ error: payoutErr.message || "Instant Payout failed" });
        return;
      }
    }

    // Default manual/RazorpayX route (Standard Payout pending approval)
    // Notify freelancer
    await db.insert(notificationsTable).values({
      userId: req.userId!,
      type: "withdrawal_requested",
      title: "Withdrawal Requested",
      body: `Your request to withdraw $${amount} is pending admin approval.`,
      link: "/withdraw",
    });

    // Notify admins
    const admins = await db.query.usersTable.findMany({ where: eq(usersTable.role, "admin") });
    for (const admin of admins) {
      await db.insert(notificationsTable).values({
        userId: admin.id,
        type: "admin_withdrawal_pending",
        title: "New Withdrawal Request",
        body: `Freelancer ${user.name} requested a withdrawal of $${amount}.`,
        link: "/dashboard/admin",
      });
    }

    res.status(201).json({ ...result, amount: Number(result!.amount) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/bank-account
router.get("/bank-account", requireAuth, async (req, res) => {
  try {
    const bank = await db.query.bankAccountsTable.findFirst({
      where: eq(bankAccountsTable.userId, req.userId!)
    });
    if (!bank) {
      res.json(null);
      return;
    }
    res.json({
      ...bank,
      accountNumber: maskAccountNumber(bank.accountNumber)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/bank-account
router.post("/bank-account", requireAuth, async (req, res) => {
  const parsed = z.object({
    accountHolderName: z.string().min(2),
    bankName: z.string().min(2),
    accountNumber: z.string().min(6),
    ifscCode: z.string().min(4),
    upiId: z.string().optional(),
    pan: z.string().optional(),
    gst: z.string().optional()
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid fields" });
    return;
  }

  try {
    // Check if account already exists
    const existing = await db.query.bankAccountsTable.findFirst({
      where: eq(bankAccountsTable.userId, req.userId!)
    });

    if (existing) {
      res.status(400).json({ error: "Bank account already linked. Use PATCH to update." });
      return;
    }

    const { accountHolderName, bankName, accountNumber, ifscCode, upiId, pan, gst } = parsed.data;

    // Encrypt account number
    const encryptedAcc = encrypt(accountNumber);

    // Create RazorpayX contact/fund account dynamically (or mock if in sandbox)
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.userId!) });
    const { contactId, fundAccountId } = await createContactAndFundAccount(
      { id: user!.id, name: user!.name, email: user!.email },
      { accountHolderName, bankName, ifscCode, accountNumber }
    );

    const [bank] = await db.insert(bankAccountsTable).values({
      userId: req.userId!,
      accountHolderName,
      bankName,
      accountNumber: encryptedAcc,
      ifscCode,
      upiId,
      pan,
      gst,
      isVerified: true, // auto-verified for local/test convenience
      contactId,
      fundAccountId
    }).returning();

    res.status(201).json({
      ...bank,
      accountNumber: maskAccountNumber(bank.accountNumber)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/bank-account
router.patch("/bank-account", requireAuth, async (req, res) => {
  const parsed = z.object({
    accountHolderName: z.string().min(2).optional(),
    bankName: z.string().min(2).optional(),
    accountNumber: z.string().min(6).optional(),
    ifscCode: z.string().min(4).optional(),
    upiId: z.string().optional(),
    pan: z.string().optional(),
    gst: z.string().optional()
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid fields" });
    return;
  }

  try {
    const existing = await db.query.bankAccountsTable.findFirst({
      where: eq(bankAccountsTable.userId, req.userId!)
    });

    if (!existing) {
      res.status(404).json({ error: "Linked bank account not found" });
      return;
    }

    const updates: any = { ...parsed.data };
    if (updates.accountNumber) {
      updates.accountNumber = encrypt(updates.accountNumber);
    }
    updates.updatedAt = new Date();

    // Recreate contact/fund account if core credentials change
    if (parsed.data.accountHolderName || parsed.data.bankName || parsed.data.accountNumber || parsed.data.ifscCode) {
      const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.userId!) });
      const rawAccountNumber = parsed.data.accountNumber || decrypt(existing.accountNumber);
      const holderName = parsed.data.accountHolderName || existing.accountHolderName;
      const bankName = parsed.data.bankName || existing.bankName;
      const ifsc = parsed.data.ifscCode || existing.ifscCode;

      const { contactId, fundAccountId } = await createContactAndFundAccount(
        { id: user!.id, name: user!.name, email: user!.email },
        { accountHolderName: holderName, bankName, ifscCode: ifsc, accountNumber: rawAccountNumber }
      );
      updates.contactId = contactId;
      updates.fundAccountId = fundAccountId;
    }

    const [updated] = await db.update(bankAccountsTable)
      .set(updates)
      .where(eq(bankAccountsTable.id, existing.id))
      .returning();

    res.json({
      ...updated,
      accountNumber: maskAccountNumber(updated!.accountNumber)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// Admin Endpoints
// ==========================================

// GET /api/admin/withdrawals
router.get("/admin/withdrawals", requireAuth, async (req, res) => {
  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.userId!) });
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const list = await db.query.withdrawalRequestsTable.findMany({
      orderBy: [desc(withdrawalRequestsTable.requestedAt)]
    });

    const enriched = [];
    for (const w of list) {
      const u = await db.query.usersTable.findFirst({ where: eq(usersTable.id, w.userId) });
      const b = await db.query.bankAccountsTable.findFirst({ where: eq(bankAccountsTable.id, w.bankAccountId) });
      enriched.push({
        ...w,
        amount: Number(w.amount),
        freelancer: u ? { name: u.name, email: u.email } : null,
        bankAccount: b ? {
          accountHolderName: b.accountHolderName,
          bankName: b.bankName,
          accountNumber: maskAccountNumber(b.accountNumber),
          ifscCode: b.ifscCode
        } : null
      });
    }

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/withdrawals/:id/approve
router.post("/admin/withdrawals/:id/approve", requireAuth, async (req, res) => {
  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.userId!) });
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const request = await db.query.withdrawalRequestsTable.findFirst({
      where: eq(withdrawalRequestsTable.id, Number(req.params.id))
    });

    if (!request) {
      res.status(404).json({ error: "Withdrawal request not found" });
      return;
    }

    if (request.status !== "pending") {
      res.status(400).json({ error: "Request is not in pending status" });
      return;
    }

    const bank = await db.query.bankAccountsTable.findFirst({
      where: eq(bankAccountsTable.id, request.bankAccountId)
    });

    if (!bank || !bank.fundAccountId) {
      res.status(400).json({ error: "Bank account fund configuration is missing" });
      return;
    }

    // Call RazorpayX API
    const payoutResult = await createPayout(bank.fundAccountId, Number(request.amount), `WR_${request.id}`);

    // Update withdrawal request
    const [updatedRequest] = await db.update(withdrawalRequestsTable)
      .set({
        payoutId: payoutResult.payoutId,
        status: payoutResult.status,
        failureReason: payoutResult.failureReason || null,
        approvedAt: new Date(),
        processedAt: payoutResult.status === "successful" ? new Date() : null
      })
      .where(eq(withdrawalRequestsTable.id, request.id))
      .returning();

    // If successful immediately (e.g. mock payouts), record wallet transactions and generate receipt/invoice
    if (payoutResult.status === "successful") {
      await db.transaction(async (tx) => {
        const [txRecord] = await tx.insert(walletTransactionsTable).values({
          walletId: request.walletId,
          type: "debit",
          amount: String(request.amount),
          description: `Withdrawal successfully processed (Payout ID: ${payoutResult.payoutId})`,
          referenceId: request.id,
          referenceType: "withdrawal",
          status: "completed",
        }).returning();

        try {
          await generateInvoiceForEvent("withdrawal", Number(request.amount), request.userId, undefined, {
            transactionId: txRecord.id,
            paymentMethod: "RazorpayX Payout",
            tx,
          });
        } catch (invErr) {
          console.error("Failed to generate withdrawal invoice:", invErr);
        }
      });
    }

    // Notify freelancer
    await db.insert(notificationsTable).values({
      userId: request.userId,
      type: "withdrawal_approved",
      title: "Withdrawal Approved",
      body: `Your withdrawal of $${request.amount} has been approved and is ${payoutResult.status}.`,
      link: "/withdraw",
    });

    res.json({ ...updatedRequest, amount: Number(updatedRequest!.amount) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/withdrawals/:id/reject
router.post("/admin/withdrawals/:id/reject", requireAuth, async (req, res) => {
  const parsed = z.object({
    adminNotes: z.string().optional()
  }).safeParse(req.body);

  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.userId!) });
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const request = await db.query.withdrawalRequestsTable.findFirst({
      where: eq(withdrawalRequestsTable.id, Number(req.params.id))
    });

    if (!request) {
      res.status(404).json({ error: "Withdrawal request not found" });
      return;
    }

    if (request.status !== "pending") {
      res.status(400).json({ error: "Request is not in pending status" });
      return;
    }

    // Return funds back to freelancer available wallet balance
    const wallet = await db.query.walletsTable.findFirst({ where: eq(walletsTable.id, request.walletId) });
    const newBalance = Number(wallet!.availableBalance) + Number(request.amount);

    const [updatedRequest] = await db.transaction(async (tx) => {
      await tx.update(walletsTable)
        .set({ availableBalance: String(newBalance) })
        .where(eq(walletsTable.id, wallet!.id));

      return tx.update(withdrawalRequestsTable)
        .set({
          status: "rejected",
          adminNotes: parsed.success ? (parsed.data.adminNotes || null) : null,
          processedAt: new Date()
        })
        .where(eq(withdrawalRequestsTable.id, request.id))
        .returning();
    });

    // Notify freelancer
    await db.insert(notificationsTable).values({
      userId: request.userId,
      type: "withdrawal_rejected",
      title: "Withdrawal Request Rejected",
      body: `Your request to withdraw $${request.amount} has been rejected. Funds returned to your available wallet balance.`,
      link: "/withdraw",
    });

    res.json({ ...updatedRequest, amount: Number(updatedRequest!.amount) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/withdrawals/:id/retry
router.post("/admin/withdrawals/:id/retry", requireAuth, async (req, res) => {
  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.userId!) });
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const request = await db.query.withdrawalRequestsTable.findFirst({
      where: eq(withdrawalRequestsTable.id, Number(req.params.id))
    });

    if (!request) {
      res.status(404).json({ error: "Withdrawal request not found" });
      return;
    }

    if (request.status !== "failed" && request.status !== "rejected") {
      res.status(400).json({ error: "Request is not in failed/rejected status" });
      return;
    }

    const bank = await db.query.bankAccountsTable.findFirst({
      where: eq(bankAccountsTable.id, request.bankAccountId)
    });

    if (!bank || !bank.fundAccountId) {
      res.status(400).json({ error: "Bank account fund configuration is missing" });
      return;
    }

    // Call Payout creation retry
    const payoutResult = await createPayout(bank.fundAccountId, Number(request.amount), `WR_${request.id}_retry`);

    const [updatedRequest] = await db.update(withdrawalRequestsTable)
      .set({
        payoutId: payoutResult.payoutId,
        status: payoutResult.status,
        failureReason: payoutResult.failureReason || null,
        processedAt: payoutResult.status === "successful" ? new Date() : null
      })
      .where(eq(withdrawalRequestsTable.id, request.id))
      .returning();

    if (payoutResult.status === "successful") {
      await db.transaction(async (tx) => {
        const [txRecord] = await tx.insert(walletTransactionsTable).values({
          walletId: request.walletId,
          type: "debit",
          amount: String(request.amount),
          description: `Withdrawal successfully processed after retry (Payout ID: ${payoutResult.payoutId})`,
          referenceId: request.id,
          referenceType: "withdrawal",
          status: "completed",
        }).returning();

        try {
          await generateInvoiceForEvent("withdrawal", Number(request.amount), request.userId, undefined, {
            transactionId: txRecord.id,
            paymentMethod: "RazorpayX Payout",
            tx,
          });
        } catch (invErr) {
          console.error("Failed to generate withdrawal invoice:", invErr);
        }
      });
    }

    res.json({ ...updatedRequest, amount: Number(updatedRequest!.amount) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
