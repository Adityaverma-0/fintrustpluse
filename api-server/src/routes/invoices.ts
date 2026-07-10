import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  db,
  invoicesTable,
  invoiceItemsTable,
  invoiceTaxesTable,
  gstProfilesTable,
  walletTransactionsTable,
  projectsTable,
  usersTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { z } from "zod";
import { generateInvoiceForEvent } from "../lib/invoices";

const router: IRouter = Router();

// Helper to serialize decimal numbers from db strings
function serializeInvoice(inv: any) {
  return {
    ...inv,
    subtotalAmount: Number(inv.subtotalAmount),
    platformFee: Number(inv.platformFee),
    gstAmount: Number(inv.gstAmount),
    cgstAmount: Number(inv.cgstAmount),
    sgstAmount: Number(inv.sgstAmount),
    igstAmount: Number(inv.igstAmount),
    tdsAmount: Number(inv.tdsAmount),
    processingFee: Number(inv.processingFee),
    discount: Number(inv.discount),
    totalAmount: Number(inv.totalAmount),
  };
}

// GET /invoices - Fetch invoices with filters
router.get("/invoices", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const dbUser = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  const role = dbUser?.role; // "client", "freelancer", or "admin"

  // Filters from query
  const { dateRange, project, status } = req.query;

  let baseCondition = sql`(${invoicesTable.clientId} = ${userId} OR ${invoicesTable.freelancerId} = ${userId})`;
  if (role === "admin") {
    // Admin sees all invoices
    baseCondition = sql`1=1`;
  }

  // Construct conditions list
  const conditions = [baseCondition];

  if (status) {
    conditions.push(eq(invoicesTable.status, String(status)));
  }

  if (project) {
    conditions.push(eq(invoicesTable.projectId, Number(project)));
  }

  // Date filters
  const now = new Date();
  if (dateRange === "today") {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    conditions.push(sql`${invoicesTable.createdAt} >= ${todayStart}`);
  } else if (dateRange === "week") {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    conditions.push(sql`${invoicesTable.createdAt} >= ${weekAgo}`);
  } else if (dateRange === "month") {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    conditions.push(sql`${invoicesTable.createdAt} >= ${monthStart}`);
  } else if (dateRange === "quarter") {
    const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
    const quarterStart = new Date(now.getFullYear(), quarterMonth, 1);
    conditions.push(sql`${invoicesTable.createdAt} >= ${quarterStart}`);
  } else if (dateRange === "year") {
    const yearStart = new Date(now.getFullYear(), 0, 1);
    conditions.push(sql`${invoicesTable.createdAt} >= ${yearStart}`);
  }

  try {
    const invoices = await db.query.invoicesTable.findMany({
      where: and(...conditions),
      orderBy: [desc(invoicesTable.createdAt)],
    });

    res.json(invoices.map(serializeInvoice));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch invoices" });
  }
});

// GET /invoices/:id - Fetch single invoice with items & taxes
router.get("/invoices/:id", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const invoice = await db.query.invoicesTable.findFirst({
      where: eq(invoicesTable.id, id),
    });

    if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }

    const dbUser = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.userId!) });
    const role = dbUser?.role;

    // Access control: only client, freelancer, or admin
    if (role !== "admin" && invoice.clientId !== req.userId && invoice.freelancerId !== req.userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const items = await db.query.invoiceItemsTable.findMany({
      where: eq(invoiceItemsTable.invoiceId, id),
    });

    const taxes = await db.query.invoiceTaxesTable.findMany({
      where: eq(invoiceTaxesTable.invoiceId, id),
    });

    res.json({
      ...serializeInvoice(invoice),
      items: items.map(i => ({ ...i, unitPrice: Number(i.unitPrice), totalPrice: Number(i.totalPrice) })),
      taxes: taxes.map(t => ({ ...t, taxRate: Number(t.taxRate), taxAmount: Number(t.taxAmount) })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch invoice detail" });
  }
});

// POST /invoices/generate - Force generate invoice
router.post("/invoices/generate", requireAuth, async (req, res) => {
  const parsed = z.object({
    type: z.enum(["escrow_deposit", "milestone_release", "refund", "withdrawal", "wallet_deposit", "platform_fee"]),
    amount: z.number().positive(),
    projectId: z.number().optional(),
    milestoneId: z.number().optional(),
    transactionId: z.number().optional(),
  }).safeParse(req.body);

  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid" }); return; }

  const { type, amount, projectId, milestoneId, transactionId } = parsed.data;

  try {
    let project = null;
    if (projectId) {
      project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, projectId) });
    }

    const invoice = await generateInvoiceForEvent(
      type,
      amount,
      req.userId!,
      project?.freelancerId ?? undefined,
      { projectId, milestoneId, transactionId }
    );

    res.json(serializeInvoice(invoice));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to generate invoice" });
  }
});

// POST /invoices/:id/download - Simulated download triggers
router.post("/invoices/:id/download", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const invoice = await db.query.invoicesTable.findFirst({ where: eq(invoicesTable.id, id) });
  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }

  res.json({ success: true, downloadUrl: invoice.qrCode, message: "PDF format compiled successfully." });
});

// POST /invoices/:id/email - Simulate email automated billing
router.post("/invoices/:id/email", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const invoice = await db.query.invoicesTable.findFirst({ where: eq(invoicesTable.id, id) });
  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }

  res.json({ success: true, message: `Invoice #${invoice.invoiceNumber} has been successfully emailed.` });
});

// GET /tax-summary - Retrieve summaries of taxes
router.get("/tax-summary", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const dbUser = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  const role = dbUser?.role;

  try {
    let baseCondition = sql`(${invoicesTable.clientId} = ${userId} OR ${invoicesTable.freelancerId} = ${userId})`;
    if (role === "admin") {
      baseCondition = sql`1=1`;
    }

    const invoices = await db.query.invoicesTable.findMany({ where: baseCondition });

    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalPlatformGst = 0;
    let totalTds = 0;

    for (const inv of invoices) {
      totalCgst += Number(inv.cgstAmount);
      totalSgst += Number(inv.sgstAmount);
      totalIgst += Number(inv.igstAmount);
      totalTds += Number(inv.tdsAmount);
      
      if (Number(inv.platformFee) > 0) {
        totalPlatformGst += Number(inv.platformFee) * 0.18; // 18% gst
      }
    }

    res.json({
      totalCgst,
      totalSgst,
      totalIgst,
      totalGst: totalCgst + totalSgst + totalIgst,
      totalPlatformGst,
      totalTds,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to calculate tax summary" });
  }
});

// GET /earnings-report - Earnings summaries for freelancers
router.get("/earnings-report", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const dbUser = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  const role = dbUser?.role;

  if (role !== "freelancer" && role !== "admin") {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  try {
    const releases = await db.query.invoicesTable.findMany({
      where: and(
        eq(invoicesTable.freelancerId, userId),
        eq(invoicesTable.type, "milestone_release")
      ),
    });

    let grossEarnings = 0;
    let platformFees = 0;
    let tdsDeduction = 0;
    let gstDeduction = 0;

    for (const r of releases) {
      grossEarnings += Number(r.subtotalAmount);
      platformFees += Number(r.platformFee);
      tdsDeduction += Number(r.tdsAmount);
      gstDeduction += Number(r.platformFee) * 0.18; // 18% on commission
    }

    res.json({
      grossEarnings,
      platformFees,
      tdsDeduction,
      gstDeduction,
      netEarnings: grossEarnings - platformFees - gstDeduction - tdsDeduction,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to generate earnings report" });
  }
});

// GET /expense-report - Expenses summaries for clients
router.get("/expense-report", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const dbUser = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  const role = dbUser?.role;

  if (role !== "client" && role !== "admin") {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  try {
    const expenses = await db.query.invoicesTable.findMany({
      where: and(
        eq(invoicesTable.clientId, userId),
        eq(invoicesTable.type, "milestone_release")
      ),
    });

    let totalSpent = 0;
    let platformFees = 0;
    let taxesPaid = 0;

    for (const e of expenses) {
      totalSpent += Number(e.totalAmount);
      platformFees += Number(e.platformFee);
      taxesPaid += Number(e.gstAmount);
    }

    res.json({
      totalSpent,
      platformFees,
      taxesPaid,
      netExpense: totalSpent - taxesPaid,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to generate expense report" });
  }
});

// GET /gst-profile - Get GST configuration details
router.get("/gst-profile", requireAuth, async (req, res) => {
  try {
    let profile = await db.query.gstProfilesTable.findFirst({
      where: eq(gstProfilesTable.userId, req.userId!),
    });

    if (!profile) {
      // Return defaults
      res.json({
        userId: req.userId!,
        companyName: "",
        billingAddress: "",
        gstin: "",
        isRegistered: false,
        state: "",
      });
      return;
    }

    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to get GST profile" });
  }
});

// POST /gst-profile - Setup/Update user GST settings
router.post("/gst-profile", requireAuth, async (req, res) => {
  const parsed = z.object({
    companyName: z.string().optional(),
    billingAddress: z.string().optional(),
    gstin: z.string().optional(),
    isRegistered: z.boolean().default(false),
    state: z.string().optional(),
  }).safeParse(req.body);

  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid" }); return; }

  const { companyName, billingAddress, gstin, isRegistered, state } = parsed.data;

  try {
    const existing = await db.query.gstProfilesTable.findFirst({
      where: eq(gstProfilesTable.userId, req.userId!),
    });

    let profile;
    if (existing) {
      [profile] = await db.update(gstProfilesTable)
        .set({
          companyName: companyName ?? null,
          billingAddress: billingAddress ?? null,
          gstin: gstin ?? null,
          isRegistered,
          state: state ?? null,
        })
        .where(eq(gstProfilesTable.userId, req.userId!))
        .returning();
    } else {
      [profile] = await db.insert(gstProfilesTable)
        .values({
          userId: req.userId!,
          companyName: companyName ?? null,
          billingAddress: billingAddress ?? null,
          gstin: gstin ?? null,
          isRegistered,
          state: state ?? null,
        })
        .returning();
    }

    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to save GST profile" });
  }
});

export default router;
