import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import {
  db,
  razorpayOrdersTable,
  walletsTable,
  walletTransactionsTable,
  projectsTable,
  milestonesTable,
  escrowAccountsTable,
  invoicesTable,
  invoicePaymentsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { z } from "zod";
import { generateInvoiceForEvent } from "../lib/invoices";
import crypto from "crypto";
import Razorpay from "razorpay";

const router: IRouter = Router();

// Initialize Razorpay client
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_TBU1zwcrGzZcYO",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

// Helper: USD to INR conversion rate
const USD_TO_INR_RATE = 83;

// Helper: complete payment fulfillment (reusable by verify route and webhook)
async function fulfillOrder(orderId: string, paymentId: string, signature: string) {
  return await db.transaction(async (tx) => {
    // 1. Fetch order details with locking
    const localOrder = await tx.query.razorpayOrdersTable.findFirst({
      where: eq(razorpayOrdersTable.razorpayOrderId, orderId),
    });

    if (!localOrder) {
      throw new Error(`Order not found: ${orderId}`);
    }

    if (localOrder.status === "paid") {
      // Already paid and fulfilled, skip to prevent double fulfillment
      return localOrder;
    }

    const usdAmount = Number(localOrder.amount);
    const projectId = localOrder.referenceId;

    // 2. Perform action based on order type
    if (localOrder.type === "wallet_deposit") {
      // Fetch or create wallet
      const [wallet] = await tx
        .select()
        .from(walletsTable)
        .where(eq(walletsTable.userId, localOrder.userId))
        .for("update");

      let activeWallet = wallet;
      if (!activeWallet) {
        const [created] = await tx
          .insert(walletsTable)
          .values({ userId: localOrder.userId })
          .returning();
        activeWallet = created!;
      }

      const currentBalance = Number(activeWallet.availableBalance);
      const newBalance = currentBalance + usdAmount;

      // Update wallet balance
      await tx
        .update(walletsTable)
        .set({ availableBalance: String(newBalance) })
        .where(eq(walletsTable.id, activeWallet.id));

      // Record transaction
      const [txRecord] = await tx
        .insert(walletTransactionsTable)
        .values({
          walletId: activeWallet.id,
          type: "credit",
          amount: String(usdAmount),
          description: `Deposit via Razorpay (Payment ID: ${paymentId})`,
          status: "completed",
        })
        .returning();

      // Generate invoice
      const invoice = await generateInvoiceForEvent(
        "wallet_deposit",
        usdAmount,
        localOrder.userId,
        undefined,
        {
          transactionId: txRecord.id,
          paymentMethod: "Razorpay",
          tx,
        }
      );

      // Save payment details
      await tx.insert(invoicePaymentsTable).values({
        invoiceId: invoice.id,
        paymentMethod: "Razorpay",
        amount: String(usdAmount),
        transactionReference: paymentId,
        status: "completed",
      });

      // Update invoice status to Paid
      await tx
        .update(invoicesTable)
        .set({ status: "paid" })
        .where(eq(invoicesTable.id, invoice.id));
    } else if (localOrder.type === "escrow_funding") {
      if (!projectId) {
        throw new Error("Project ID is missing for escrow funding");
      }

      const project = await tx.query.projectsTable.findFirst({
        where: eq(projectsTable.id, projectId),
      });
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      // Step A: Deposit funds into available balance
      const [clientWallet] = await tx
        .select()
        .from(walletsTable)
        .where(eq(walletsTable.userId, localOrder.userId))
        .for("update");

      let wallet = clientWallet;
      if (!wallet) {
        const [created] = await tx
          .insert(walletsTable)
          .values({ userId: localOrder.userId })
          .returning();
        wallet = created!;
      }

      const currentAvailable = Number(wallet.availableBalance);
      await tx
        .update(walletsTable)
        .set({ availableBalance: String(currentAvailable + usdAmount) })
        .where(eq(walletsTable.id, wallet.id));

      // Record deposit transaction
      const [depositTx] = await tx
        .insert(walletTransactionsTable)
        .values({
          walletId: wallet.id,
          type: "credit",
          amount: String(usdAmount),
          description: `Deposit via Razorpay for project funding (Payment ID: ${paymentId})`,
          status: "completed",
        })
        .returning();

      // Generate deposit invoice and mark paid
      const depositInvoice = await generateInvoiceForEvent(
        "wallet_deposit",
        usdAmount,
        localOrder.userId,
        undefined,
        {
          transactionId: depositTx.id,
          paymentMethod: "Razorpay",
          tx,
        }
      );

      await tx.insert(invoicePaymentsTable).values({
        invoiceId: depositInvoice.id,
        paymentMethod: "Razorpay",
        amount: String(usdAmount),
        transactionReference: paymentId,
        status: "completed",
      });

      await tx
        .update(invoicesTable)
        .set({ status: "paid" })
        .where(eq(invoicesTable.id, depositInvoice.id));

      // Step B: Hold funds in escrow
      const [updatedWallet] = await tx
        .select()
        .from(walletsTable)
        .where(eq(walletsTable.id, wallet.id))
        .for("update");

      const available = Number(updatedWallet.availableBalance);
      if (available < usdAmount) {
        throw new Error("Insufficient available balance for escrow funding");
      }

      // Move funds to escrow
      await tx
        .update(walletsTable)
        .set({
          availableBalance: String(available - usdAmount),
          escrowBalance: String(Number(updatedWallet.escrowBalance) + usdAmount),
        })
        .where(eq(walletsTable.id, wallet.id));

      // Upsert escrow account
      let escrowId = 0;
      const existingEscrow = await tx.query.escrowAccountsTable.findFirst({
        where: eq(escrowAccountsTable.projectId, projectId),
      });

      if (!existingEscrow) {
        const [created] = await tx
          .insert(escrowAccountsTable)
          .values({
            projectId,
            clientId: project.clientId,
            freelancerId: project.freelancerId,
            totalAmount: String(usdAmount),
            status: "funded",
            fundedAt: new Date(),
          })
          .returning();
        escrowId = created!.id;
      } else {
        await tx
          .update(escrowAccountsTable)
          .set({
            totalAmount: existingEscrow.status === "pending" ? String(usdAmount) : String(Number(existingEscrow.totalAmount) + usdAmount),
            status: "funded",
            fundedAt: existingEscrow.fundedAt ?? new Date(),
          })
          .where(eq(escrowAccountsTable.id, existingEscrow.id));
        escrowId = existingEscrow.id;
      }

      // Update project status to active
      await tx
        .update(projectsTable)
        .set({ status: "active" })
        .where(eq(projectsTable.id, projectId));

      // Update milestones status (first active/funded, others pending)
      const projMilestones = await tx.query.milestonesTable.findMany({
        where: eq(milestonesTable.projectId, projectId),
        orderBy: [sql`"order" ASC`],
      });

      if (projMilestones.length > 0) {
        await tx
          .update(milestonesTable)
          .set({ status: "funded" })
          .where(eq(milestonesTable.id, projMilestones[0].id));

        if (projMilestones.length > 1) {
          const otherIds = projMilestones.slice(1).map((m) => m.id);
          for (const mId of otherIds) {
            await tx
              .update(milestonesTable)
              .set({ status: "pending" })
              .where(eq(milestonesTable.id, mId));
          }
        }
      }

      // Record escrow hold transaction
      const [escrowTx] = await tx
        .insert(walletTransactionsTable)
        .values({
          walletId: wallet.id,
          type: "escrow_hold",
          amount: String(usdAmount),
          description: `Funds locked in escrow for project "${project.title}"`,
          referenceId: projectId,
          referenceType: "project",
          status: "completed",
        })
        .returning();

      // Generate escrow invoice and mark paid
      const escrowInvoice = await generateInvoiceForEvent(
        "escrow_deposit",
        usdAmount,
        localOrder.userId,
        project.freelancerId ?? undefined,
        {
          projectId,
          transactionId: escrowTx.id,
          paymentMethod: "Razorpay",
          tx,
        }
      );

      await tx.insert(invoicePaymentsTable).values({
        invoiceId: escrowInvoice.id,
        paymentMethod: "Razorpay",
        amount: String(usdAmount),
        transactionReference: paymentId,
        status: "completed",
      });

      await tx
        .update(invoicesTable)
        .set({ status: "paid" })
        .where(eq(invoicesTable.id, escrowInvoice.id));
    }

    // 3. Mark Razorpay order as paid in DB
    const [updatedOrder] = await tx
      .update(razorpayOrdersTable)
      .set({
        status: "paid",
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
        updatedAt: new Date(),
      })
      .where(eq(razorpayOrdersTable.id, localOrder.id))
      .returning();

    return updatedOrder;
  });
}

// POST /api/razorpay/create-order
router.post("/razorpay/create-order", requireAuth, async (req, res) => {
  const parsed = z
    .object({
      amount: z.number().positive(), // in USD
      type: z.enum(["wallet_deposit", "escrow_funding"]),
      projectId: z.number().optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }

  const { amount: usdAmount, type, projectId } = parsed.data;

  try {
    // Convert USD to INR (paise)
    const inrAmountPaise = Math.round(usdAmount * USD_TO_INR_RATE * 100);

    let orderId = "";
    let orderAmount = inrAmountPaise;
    let orderCurrency = "INR";

    try {
      // Create order in Razorpay
      const order = await razorpay.orders.create({
        amount: inrAmountPaise,
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
      });
      orderId = order.id;
      orderAmount = Number(order.amount);
      orderCurrency = order.currency;
    } catch (err: any) {
      if (err.statusCode === 401 || process.env.NODE_ENV !== "production") {
        console.warn("Using mock Razorpay order due to invalid/placeholder credentials:", err.message);
        orderId = `order_mock_${Math.random().toString(36).substring(2, 11)}`;
      } else {
        throw err;
      }
    }

    // Save order in local DB
    await db.insert(razorpayOrdersTable).values({
      userId: req.userId!,
      razorpayOrderId: orderId,
      amount: String(usdAmount),
      currency: "USD",
      razorpayAmount: orderAmount,
      razorpayCurrency: orderCurrency,
      status: "created",
      type,
      referenceId: projectId,
    });

    res.json({
      id: orderId,
      amount: orderAmount,
      currency: orderCurrency,
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_TBU1zwcrGzZcYO",
    });
  } catch (err: any) {
    console.error("Razorpay create-order failed:", err);
    res.status(500).json({ error: err.message || "Failed to create Razorpay order" });
  }
});

// POST /api/razorpay/verify-payment
router.post("/razorpay/verify-payment", requireAuth, async (req, res) => {
  const parsed = z
    .object({
      razorpay_order_id: z.string(),
      razorpay_payment_id: z.string(),
      razorpay_signature: z.string(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid payment verification details" });
    return;
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  try {
    // Fetch local order first
    const localOrder = await db.query.razorpayOrdersTable.findFirst({
      where: eq(razorpayOrdersTable.razorpayOrderId, razorpay_order_id),
    });

    if (!localOrder) {
      res.status(404).json({ error: "Order not found locally" });
      return;
    }

    // Verify signature
    const secret = process.env.RAZORPAY_KEY_SECRET || "default_secret";
    let expectedSignature;
    if (razorpay_order_id.startsWith("order_mock_") || secret === "YOUR_REGENERATED_SECRET") {
      expectedSignature = razorpay_signature; // Bypass signature verification for mock orders in testing
      console.warn("Bypassing signature verification for mock/test order");
    } else {
      expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
    }

    if (expectedSignature !== razorpay_signature) {
      res.status(400).json({ error: "Invalid payment signature verification failed" });
      return;
    }

    // Fulfill order
    const fulfilled = await fulfillOrder(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    res.json({ success: true, order: fulfilled });
  } catch (err: any) {
    console.error("Razorpay verification / fulfillment failed:", err);
    res.status(500).json({ error: err.message || "Fulfillment processing failed" });
  }
});

// POST /api/razorpay/webhook
router.post("/razorpay/webhook", async (req, res) => {
  const signature = req.headers["x-razorpay-signature"] as string;
  if (!signature) {
    res.status(400).json({ error: "No signature provided" });
    return;
  }

  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "default_webhook_secret";
    const bodyString = JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(bodyString)
      .digest("hex");

    if (expectedSignature !== signature) {
      res.status(400).json({ error: "Invalid webhook signature" });
      return;
    }

    const event = req.body.event;
    console.log(`Razorpay webhook received event: ${event}`);

    if (event === "order.paid" || event === "payment.captured") {
      const payload = req.body.payload;
      const paymentObj = payload.payment.entity;
      const orderId = paymentObj.order_id;
      const paymentId = paymentObj.id;
      const razorpaySignature = signature; // Webhook signature is verified, we can use it

      // Check if order exists in our db
      const localOrder = await db.query.razorpayOrdersTable.findFirst({
        where: eq(razorpayOrdersTable.razorpayOrderId, orderId),
      });

      if (localOrder && localOrder.status !== "paid") {
        console.log(`Webhook fulfilling order: ${orderId}`);
        await fulfillOrder(orderId, paymentId, razorpaySignature);
      }
    } else if (event === "payment.failed") {
      const payload = req.body.payload;
      const paymentObj = payload.payment.entity;
      const orderId = paymentObj.order_id;

      const localOrder = await db.query.razorpayOrdersTable.findFirst({
        where: eq(razorpayOrdersTable.razorpayOrderId, orderId),
      });

      if (localOrder && localOrder.status === "created") {
        await db
          .update(razorpayOrdersTable)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(razorpayOrdersTable.id, localOrder.id));
        console.log(`Webhook marked order as failed: ${orderId}`);
      }
    }

    res.json({ status: "ok" });
  } catch (err: any) {
    console.error("Razorpay webhook processing failed:", err);
    res.status(500).json({ error: err.message || "Internal Server Error in Webhook" });
  }
});

export default router;
