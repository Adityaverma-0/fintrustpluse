import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Search,
  Download,
  Printer,
  Mail,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Shield,
  Loader2,
  Calendar,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  AlertCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function InvoiceCenter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isFreelancer = user?.role === "freelancer";
  const isAdmin = user?.role === "admin";

  const [activeTab, setActiveTab] = useState<"history" | "taxes">("history");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("month");
  
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Queries
  const { data: invoices = [], isLoading: invLoading } = useQuery<any[]>({
    queryKey: ["invoices", { dateFilter, statusFilter }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (dateFilter) params.append("dateRange", dateFilter);
      if (statusFilter) params.append("status", statusFilter);
      return api.get(`/invoices?${params.toString()}`);
    }
  });

  const { data: taxSummary, isLoading: taxLoading } = useQuery<any>({
    queryKey: ["tax-summary"],
    queryFn: () => api.get("/tax-summary"),
  });

  const { data: earningsReport } = useQuery<any>({
    queryKey: ["earnings-report"],
    queryFn: () => api.get("/earnings-report"),
    enabled: isFreelancer || isAdmin,
  });

  const { data: expenseReport } = useQuery<any>({
    queryKey: ["expense-report"],
    queryFn: () => api.get("/expense-report"),
    enabled: !isFreelancer || isAdmin,
  });

  const { data: selectedInvoiceDetail, isLoading: detailLoading } = useQuery<any>({
    queryKey: ["invoice-detail", selectedInvoiceId],
    queryFn: () => api.get(`/invoices/${selectedInvoiceId}`),
    enabled: !!selectedInvoiceId,
  });

  // Mutations
  const emailMutation = useMutation({
    mutationFn: (id: number) => api.post(`/invoices/${id}/email`, {}),
    onSuccess: (data: any) => {
      toast({ title: "Email Sent!", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Failed to send email", description: err.message, variant: "destructive" });
    }
  });

  const downloadMutation = useMutation({
    mutationFn: (id: number) => api.post(`/invoices/${id}/download`, {}),
    onSuccess: (data: any) => {
      if (!selectedInvoiceDetail) return;
      toast({ title: "Download Initialized!", description: "Legally compliant invoice receipt downloaded successfully." });

      const itemsRows = selectedInvoiceDetail.items?.map((item: any) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${item.description}</td>
          <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e5e7eb;">${item.quantity}</td>
          <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">$${item.unitPrice.toFixed(2)}</td>
          <td style="padding: 12px; text-align: right; font-weight: bold; border-bottom: 1px solid #e5e7eb; color: #111827;">$${item.totalPrice.toFixed(2)}</td>
        </tr>
      `).join("") || "";

      const taxRows = `
        ${selectedInvoiceDetail.cgstAmount > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; color: #4b5563;">
            <span>CGST (9%):</span>
            <span>$${selectedInvoiceDetail.cgstAmount.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; color: #4b5563;">
            <span>SGST (9%):</span>
            <span>$${selectedInvoiceDetail.sgstAmount.toFixed(2)}</span>
          </div>
        ` : ""}
        ${selectedInvoiceDetail.igstAmount > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; color: #4b5563;">
            <span>IGST (18%):</span>
            <span>$${selectedInvoiceDetail.igstAmount.toFixed(2)}</span>
          </div>
        ` : ""}
        ${selectedInvoiceDetail.tdsAmount > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; color: #4b5563;">
            <span>TDS Deduction (1%):</span>
            <span>-$${selectedInvoiceDetail.tdsAmount.toFixed(2)}</span>
          </div>
        ` : ""}
      `;

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${selectedInvoiceDetail.invoiceNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111827; line-height: 1.5; padding: 40px; max-width: 800px; margin: auto; background-color: #ffffff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f3f4f6; padding-bottom: 24px; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: 800; color: #3b82f6; letter-spacing: -0.025em; }
    .meta-box { text-align: right; }
    .title-banner { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #4b5563; letter-spacing: 0.1em; }
    .inv-num { font-size: 20px; font-weight: 800; margin: 4px 0; color: #111827; }
    .details-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-bottom: 32px; }
    .details-card { background: #f9fafb; padding: 20px; border-radius: 16px; border: 1px solid #e5e7eb; }
    .card-label { font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .card-title { font-size: 14px; font-weight: 700; color: #111827; }
    .card-text { font-size: 12px; color: #4b5563; margin-top: 4px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    th { border-bottom: 2px solid #e5e7eb; padding: 12px; text-align: left; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .summary-section { display: flex; justify-content: space-between; align-items: flex-start; padding-top: 20px; border-top: 2px solid #f3f4f6; }
    .qr-box { display: flex; align-items: center; gap: 16px; }
    .totals-box { width: 320px; }
    .total-row { display: flex; justify-content: space-between; border-top: 2px solid #111827; padding-top: 12px; margin-top: 12px; font-size: 16px; font-weight: 800; color: #111827; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">fintrust+</div>
      <div class="card-text" style="font-size: 11px; color: #6b7280; margin-top: 6px;">
        FinTrust+ Escrow Technologies Private Limited<br>
        BKC Bandra, Corporate Tower A, Mumbai, 400051<br>
        GSTIN: 27AAACT1245G1ZX
      </div>
    </div>
    <div class="meta-box">
      <div class="title-banner">Tax Invoice / Receipt</div>
      <div class="inv-num">#${selectedInvoiceDetail.invoiceNumber}</div>
      <div class="card-text" style="font-size: 11px; color: #6b7280;">
        Date: ${formatDate(selectedInvoiceDetail.createdAt)}<br>
        Due Date: ${formatDate(selectedInvoiceDetail.dueDate || selectedInvoiceDetail.createdAt)}
      </div>
    </div>
  </div>

  <div class="details-row">
    <div class="details-card">
      <div class="card-label">Billed To (Client)</div>
      <div class="card-title">${selectedInvoiceDetail.clientName}</div>
      ${selectedInvoiceDetail.clientCompany ? `<div class="card-text" style="font-weight: 500;">${selectedInvoiceDetail.clientCompany}</div>` : ""}
      <div class="card-text" style="white-space: pre-wrap;">${selectedInvoiceDetail.clientAddress}</div>
      ${selectedInvoiceDetail.clientGstin ? `<div class="card-text" style="font-weight: 700; color: #111827; margin-top: 8px;">GSTIN: ${selectedInvoiceDetail.clientGstin}</div>` : ""}
    </div>
    <div class="details-card" style="text-align: right;">
      <div class="card-label">Service Provider (Freelancer)</div>
      ${selectedInvoiceDetail.freelancerName ? `
        <div class="card-title">${selectedInvoiceDetail.freelancerName}</div>
        <div class="card-text" style="white-space: pre-wrap;">${selectedInvoiceDetail.freelancerGstin ? 'GST Registered Contractor' : 'Unregistered GST Freelancer'}</div>
        ${selectedInvoiceDetail.freelancerGstin ? `<div class="card-text" style="font-weight: 700; color: #111827; margin-top: 8px;">GSTIN: ${selectedInvoiceDetail.freelancerGstin}</div>` : ""}
      ` : `
        <div class="card-title">FinTrust+ Platform</div>
        <div class="card-text">Platform Administration Services</div>
      `}
    </div>
  </div>

  <div style="font-size: 12px; margin-bottom: 24px;">
    <span class="card-label" style="display: block; margin-bottom: 4px;">Project Reference</span>
    <strong style="font-size: 14px; color: #111827;">${selectedInvoiceDetail.projectTitle || "Wallet Operations"}</strong>
  </div>

  <table>
    <thead>
      <tr>
        <th style="padding-left: 12px;">Description</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Unit Price</th>
        <th style="text-align: right; padding-right: 12px;">Total Price</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="summary-section">
    <div class="qr-box">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(selectedInvoiceDetail.qrCode || "")}" style="width: 90px; height: 90px; border: 1px solid #e5e7eb; border-radius: 12px; padding: 6px; background: white;" alt="QR Code">
      <div>
        <div style="font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em;">Cryptographic Seal</div>
        <div style="font-size: 10px; color: #10b981; font-weight: 800; margin-top: 4px; display: flex; align-items: center; gap: 4px;">✔ SECURE DIGITAL SIGNATURE</div>
        <div style="font-size: 9px; color: #6b7280; margin-top: 3px; line-height: 1.4;">Verified by FinTrust+ Escrow Protocol.<br>Legally valid invoice receipt.</div>
      </div>
    </div>

    <div class="totals-box">
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; color: #4b5563;">
        <span>Subtotal:</span>
        <span>$${selectedInvoiceDetail.subtotalAmount.toFixed(2)}</span>
      </div>
      ${selectedInvoiceDetail.platformFee > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; color: #4b5563;">
          <span>Platform Fee:</span>
          <span>$${selectedInvoiceDetail.platformFee.toFixed(2)}</span>
        </div>
      ` : ""}
      ${taxRows}
      <div class="total-row">
        <span>Total Paid:</span>
        <span style="color: #3b82f6;">$${selectedInvoiceDetail.totalAmount.toFixed(2)}</span>
      </div>
    </div>
  </div>

  <div style="margin-top: 80px; border-top: 1px solid #f3f4f6; padding-top: 24px; font-size: 10px; text-align: center; color: #9ca3af;">
    This is a system generated document. No physical signature is required.
  </div>
</body>
</html>`;

      const link = document.createElement("a");
      link.href = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
      link.download = `Invoice-${selectedInvoiceDetail?.invoiceNumber}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    onError: (err: any) => {
      toast({ title: "Failed to download", description: err.message, variant: "destructive" });
    }
  });

  // Filtered invoices
  const filteredInvoices = invoices.filter(inv => {
    const term = searchTerm.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(term) ||
      (inv.projectTitle && inv.projectTitle.toLowerCase().includes(term)) ||
      (inv.clientName && inv.clientName.toLowerCase().includes(term)) ||
      (inv.freelancerName && inv.freelancerName.toLowerCase().includes(term))
    );
  });

  const triggerPrint = () => {
    window.print();
  };

  // Status badging
  const STATUS_STYLES: Record<string, string> = {
    generated: "bg-blue-50 text-blue-700 border-blue-200",
    paid: "bg-green-50 text-green-700 border-green-200",
    pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
    refunded: "bg-purple-50 text-purple-700 border-purple-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className="min-h-screen bg-secondary/20 print:bg-white print:p-0">
      <div className="print:hidden">
        <Navbar />
      </div>

      <div className="container mx-auto px-4 py-8 print:p-0">
        {/* Navigation header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 print:hidden"
        >
          <div>
            <h1 className="text-2xl font-bold">Invoice & Billing Center</h1>
            <p className="text-muted-foreground text-sm">Review receipts, settlements, and GST calculations.</p>
          </div>
          <div className="flex bg-background p-1.5 rounded-full border shadow-sm self-start">
            <Button
              size="sm"
              variant={activeTab === "history" ? "default" : "ghost"}
              className="rounded-full px-5 text-xs font-semibold"
              onClick={() => setActiveTab("history")}
            >
              Invoice History
            </Button>
            <Button
              size="sm"
              variant={activeTab === "taxes" ? "default" : "ghost"}
              className="rounded-full px-5 text-xs font-semibold"
              onClick={() => setActiveTab("taxes")}
            >
              Tax Dashboard
            </Button>
          </div>
        </motion.div>

        {/* TAB 1: History & Filter view */}
        <AnimatePresence mode="wait">
          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 print:block"
            >
              {/* Filters Block */}
              <div className="bg-card border rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm print:hidden">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
                  <Input
                    placeholder="Search by invoice number or project..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 rounded-full border-muted/50 bg-secondary/15"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Filter className="h-3.5 w-3.5" /> Filter by:
                  </div>
                  
                  <select
                    className="text-xs rounded-lg border bg-background p-2 outline-none focus:ring-1 focus:ring-primary font-medium"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="generated">Generated</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="refunded">Refunded</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  <select
                    className="text-xs rounded-lg border bg-background p-2 outline-none focus:ring-1 focus:ring-primary font-medium"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  >
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="quarter">This Quarter</option>
                    <option value="year">This Year</option>
                    <option value="">All Time</option>
                  </select>
                </div>
              </div>

              {/* History Table Card */}
              <Card className="border border-muted/50 overflow-hidden shadow-sm">
                <CardContent className="p-0">
                  {invLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : filteredInvoices.length === 0 ? (
                    <div className="text-center py-16">
                      <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                      <h4 className="font-semibold text-sm">No Invoices Found</h4>
                      <p className="text-xs text-muted-foreground mt-1">Legally calculated receipts will generate here upon transactions.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-secondary/40 border-b font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                            <th className="px-6 py-4">Invoice ID</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4">Project / Description</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Subtotal</th>
                            <th className="px-6 py-4">Taxes (GST)</th>
                            <th className="px-6 py-4">Total Amount</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right print:hidden">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-muted/20">
                          {filteredInvoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-secondary/10 transition-colors">
                              <td className="px-6 py-4 font-semibold text-primary">{inv.invoiceNumber}</td>
                              <td className="px-6 py-4 capitalize font-medium">{inv.type.replace(/_/g, " ")}</td>
                              <td className="px-6 py-4 max-w-[200px] truncate">
                                <span className="font-semibold block text-foreground truncate">{inv.projectTitle || "Wallet transfer"}</span>
                                <span className="text-[10px] text-muted-foreground block truncate">
                                  {isFreelancer ? `Client: ${inv.clientName}` : `Freelancer: ${inv.freelancerName || "Platform"}`}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-muted-foreground">{formatDate(inv.createdAt)}</td>
                              <td className="px-6 py-4 font-semibold">${inv.subtotalAmount.toFixed(2)}</td>
                              <td className="px-6 py-4 font-medium text-muted-foreground">${inv.gstAmount.toFixed(2)}</td>
                              <td className="px-6 py-4 font-bold text-foreground">${inv.totalAmount.toFixed(2)}</td>
                              <td className="px-6 py-4">
                                <Badge variant="outline" className={`text-[10px] uppercase font-semibold py-0.5 border ${STATUS_STYLES[inv.status] || "bg-secondary"}`}>
                                  {inv.status}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 text-right print:hidden">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 rounded-full p-0"
                                  onClick={() => {
                                    setSelectedInvoiceId(inv.id);
                                    setShowPreviewModal(true);
                                  }}
                                >
                                  <Eye className="h-3.5 w-3.5 text-primary" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* TAB 2: Tax Dashboard */}
          {activeTab === "taxes" && (
            <motion.div
              key="taxes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8 print:hidden"
            >
              {/* Analytics summary panels */}
              {taxLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Earnings Card (Freelancer / Admin) */}
                  {(isFreelancer || isAdmin) && earningsReport && (
                    <Card>
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                            <ArrowDownLeft className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground block font-medium">Gross Earnings</span>
                            <span className="text-xl font-bold text-foreground">${earningsReport.grossEarnings.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="space-y-2 pt-2 border-t text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Platform Fee (5%):</span>
                            <span className="font-semibold">-${earningsReport.platformFees.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">GST on platform fee (18%):</span>
                            <span className="font-semibold">-${earningsReport.gstDeduction.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">TDS Deduction (1%):</span>
                            <span className="font-semibold">-${earningsReport.tdsDeduction.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between pt-1.5 border-t font-bold text-green-600">
                            <span>Net Earnings:</span>
                            <span>${earningsReport.netEarnings.toFixed(2)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Expenses Card (Client / Admin) */}
                  {(!isFreelancer || isAdmin) && expenseReport && (
                    <Card>
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <ArrowUpRight className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground block font-medium">Total Expenses</span>
                            <span className="text-xl font-bold text-foreground">${expenseReport.totalSpent.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="space-y-2 pt-2 border-t text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">GST Taxes Paid:</span>
                            <span className="font-semibold">${expenseReport.taxesPaid.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Platform Commissions:</span>
                            <span className="font-semibold">${expenseReport.platformFees.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between pt-1.5 border-t font-bold text-primary">
                            <span>Net Deliverables Amount:</span>
                            <span>${expenseReport.netExpense.toFixed(2)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Tax summary splits */}
                  <Card>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                          <Shield className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block font-medium">Taxes Paid & Collected</span>
                          <span className="text-xl font-bold text-foreground">${taxSummary.totalGst.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="space-y-2 pt-2 border-t text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">CGST Amount (9%):</span>
                          <span className="font-medium">${taxSummary.totalCgst.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">SGST Amount (9%):</span>
                          <span className="font-medium">${taxSummary.totalSgst.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">IGST Amount (18%):</span>
                          <span className="font-medium">${taxSummary.totalIgst.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-1.5 border-t font-bold text-purple-600">
                          <span>Total GST:</span>
                          <span>${taxSummary.totalGst.toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* GST Configurations Config Warning */}
              <div className="bg-primary/[0.02] border border-primary/20 rounded-2xl p-5 flex items-start gap-3.5">
                <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm">Configuring GST Profiles</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    GST numbers and states are evaluated automatically to calculate IGST vs. CGST + SGST tax allocations. Ensure your billing details are up to date under the <a href="/wallet" className="text-primary font-semibold hover:underline">GST Profile</a> section in your wallet dashboard.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Invoice PDF Preview Dialog */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-[700px] w-full p-0 overflow-hidden print:w-full print:p-0 print:border-none print:shadow-none print:max-w-none">
          {detailLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedInvoiceDetail ? (
            <div className="flex flex-col h-full bg-background print:bg-white">
              {/* Header inside modal (Hidden during browser Print page rendering) */}
              <DialogHeader className="p-5 border-b flex flex-row items-center justify-between gap-4 print:hidden">
                <div>
                  <DialogTitle className="text-base flex items-center gap-1.5">
                    <FileText className="h-4.5 w-4.5 text-primary" /> Invoice Detail Preview
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Legal tax invoice #{selectedInvoiceDetail.invoiceNumber}
                  </DialogDescription>
                </div>
              </DialogHeader>

              {/* Printable Invoice Container */}
              <div id="print-area" className="p-8 space-y-6 overflow-y-auto max-h-[500px] print:max-h-none print:p-0 print:overflow-visible">
                {/* Invoice Letterhead */}
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <span className="font-black text-2xl tracking-tight text-primary">fintrust+</span>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      FinTrust+ Escrow Technologies Private Limited<br />
                      BKC Bandra, Corporate Tower A, Mumbai, 400051<br />
                      GSTIN: 27AAACT1245G1ZX
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="text-xs uppercase font-extrabold tracking-widest text-muted-foreground">Tax Invoice / Receipt</span>
                    <h3 className="font-extrabold text-sm text-foreground">#{selectedInvoiceDetail.invoiceNumber}</h3>
                    <p className="text-[10px] text-muted-foreground">
                      Date: {formatDate(selectedInvoiceDetail.createdAt)}<br />
                      Due Date: {formatDate(selectedInvoiceDetail.dueDate || selectedInvoiceDetail.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Billing details grid */}
                <div className="grid grid-cols-2 gap-6 bg-secondary/15 rounded-2xl p-4 border print:border-muted">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Billed To (Client)</span>
                    <p className="text-xs font-bold text-foreground">{selectedInvoiceDetail.clientName}</p>
                    {selectedInvoiceDetail.clientCompany && <p className="text-[10px] text-foreground">{selectedInvoiceDetail.clientCompany}</p>}
                    <p className="text-[10px] text-muted-foreground leading-relaxed max-w-[200px] whitespace-pre-wrap">
                      {selectedInvoiceDetail.clientAddress}
                    </p>
                    {selectedInvoiceDetail.clientGstin && (
                      <p className="text-[10px] font-medium text-foreground">GSTIN: {selectedInvoiceDetail.clientGstin}</p>
                    )}
                  </div>

                  <div className="space-y-1.5 text-right">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Service Provider (Freelancer)</span>
                    {selectedInvoiceDetail.freelancerName ? (
                      <>
                        <p className="text-xs font-bold text-foreground">{selectedInvoiceDetail.freelancerName}</p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed ml-auto max-w-[200px] whitespace-pre-wrap">
                          {selectedInvoiceDetail.freelancerName && !selectedInvoiceDetail.freelancerGstin ? "Unregistered GST Freelancer" : "GST Registered Contractor"}
                        </p>
                        {selectedInvoiceDetail.freelancerGstin && (
                          <p className="text-[10px] font-medium text-foreground">GSTIN: {selectedInvoiceDetail.freelancerGstin}</p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-bold text-foreground">FinTrust+ Platform</p>
                        <p className="text-[10px] text-muted-foreground">Platform Administration Services</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Scope Metadata */}
                <div className="text-xs space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">Project References:</span>
                  <p className="font-medium text-foreground">
                    Project: <span className="font-bold">{selectedInvoiceDetail.projectTitle || "Wallet Operations"}</span>
                    {selectedInvoiceDetail.projectId && ` (ID: #${selectedInvoiceDetail.projectId})`}
                  </p>
                  {selectedInvoiceDetail.contractId && (
                    <p className="text-[10px] text-muted-foreground">Contract Agreement ID: #{selectedInvoiceDetail.contractId}</p>
                  )}
                </div>

                {/* Items Table */}
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b font-bold text-muted-foreground text-[10px] uppercase">
                      <th className="py-2.5">Description</th>
                      <th className="py-2.5 text-center">Qty</th>
                      <th className="py-2.5 text-right font-bold">Unit Price</th>
                      <th className="py-2.5 text-right font-bold">Total Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted/10">
                    {selectedInvoiceDetail.items?.map((item: any) => (
                      <tr key={item.id}>
                        <td className="py-3 font-semibold text-foreground">{item.description}</td>
                        <td className="py-3 text-center">{item.quantity}</td>
                        <td className="py-3 text-right">${item.unitPrice.toFixed(2)}</td>
                        <td className="py-3 text-right font-bold">${item.totalPrice.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Taxes & Calculation Breakdowns */}
                <div className="grid grid-cols-2 gap-8 pt-4 border-t">
                  <div className="space-y-4">
                    {/* QR Code and digital seal */}
                    <div className="flex gap-3 items-center">
                      <div className="w-16 h-16 border rounded-xl flex items-center justify-center p-1 bg-white print:border">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(selectedInvoiceDetail.qrCode || "")}`} 
                          alt="Verification QR" 
                          className="w-full h-full"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase block">Cryptographic Seal</span>
                        <p className="text-[9px] text-emerald-600 font-bold leading-none flex items-center gap-0.5">
                          <CheckCircle className="h-3 w-3 fill-current" /> SECURE DIGITAL SIGNATURE
                        </p>
                        <p className="text-[8px] text-muted-foreground leading-tight">
                          Verified by FinTrust+ Escrow Protocol.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal amount:</span>
                      <span className="font-semibold">${selectedInvoiceDetail.subtotalAmount.toFixed(2)}</span>
                    </div>

                    {selectedInvoiceDetail.platformFee > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Platform fee deduction:</span>
                        <span className="font-semibold">${selectedInvoiceDetail.platformFee.toFixed(2)}</span>
                      </div>
                    )}

                    {selectedInvoiceDetail.cgstAmount > 0 && (
                      <>
                        <div className="flex justify-between text-muted-foreground text-[10px]">
                          <span>CGST (9%):</span>
                          <span>${selectedInvoiceDetail.cgstAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground text-[10px]">
                          <span>SGST (9%):</span>
                          <span>${selectedInvoiceDetail.sgstAmount.toFixed(2)}</span>
                        </div>
                      </>
                    )}

                    {selectedInvoiceDetail.igstAmount > 0 && (
                      <div className="flex justify-between text-muted-foreground text-[10px]">
                        <span>IGST (18%):</span>
                        <span>${selectedInvoiceDetail.igstAmount.toFixed(2)}</span>
                      </div>
                    )}

                    {selectedInvoiceDetail.tdsAmount > 0 && (
                      <div className="flex justify-between text-muted-foreground text-[10px]">
                        <span>TDS Deduction (1%):</span>
                        <span>-${selectedInvoiceDetail.tdsAmount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between border-t pt-2 text-sm font-bold text-foreground">
                      <span>Total Invoice Paid:</span>
                      <span className="text-primary font-black">${selectedInvoiceDetail.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons (Hidden during printing) */}
              <DialogFooter className="p-5 border-t bg-secondary/15 flex flex-row justify-end gap-2.5 print:hidden">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="rounded-full text-xs font-semibold gap-1.5"
                  onClick={triggerPrint}
                >
                  <Printer className="h-3.5 w-3.5" /> Print Invoice
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="rounded-full text-xs font-semibold gap-1.5"
                  disabled={emailMutation.isPending}
                  onClick={() => emailMutation.mutate(selectedInvoiceDetail.id)}
                >
                  {emailMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                  Email Invoice
                </Button>
                <Button 
                  size="sm" 
                  className="rounded-full text-xs font-semibold gap-1.5"
                  disabled={downloadMutation.isPending}
                  onClick={() => downloadMutation.mutate(selectedInvoiceDetail.id)}
                >
                  {downloadMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  Download PDF
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
