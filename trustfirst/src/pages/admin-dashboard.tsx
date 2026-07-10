import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Users,
  DollarSign,
  Briefcase,
  AlertTriangle,
  CheckCircle,
  Clock,
  Ban,
  Loader2,
  Settings,
  Search,
  Download,
  Plus,
  Trash2,
  Activity,
  Megaphone,
  Key,
  Database,
  Globe,
  Lock,
  Percent,
  TrendingUp,
  RefreshCw,
  Eye,
  Terminal,
  Server,
  Code,
  Tag,
  ExternalLink,
} from "lucide-react";

export default function AdminDashboard() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    "overview" | "fraud" | "commissions" | "referrals_coupons" | "featured_jobs" | "escrow" | "ai" | "announcements" | "notes_roles" | "logs_backups" | "flags_audit"
  >("overview");

  // Sub-tabs for combined sections
  const [refCouponsSubTab, setRefCouponsSubTab] = useState<"referrals" | "coupons">("referrals");
  const [notesRolesSubTab, setNotesRolesSubTab] = useState<"notes" | "roles">("notes");
  const [logsBackupsSubTab, setLogsBackupsSubTab] = useState<"webhooks" | "backups" | "health">("webhooks");
  const [flagsAuditSubTab, setFlagsAuditSubTab] = useState<"flags" | "audit">("flags");

  // Local Form States
  // Commission settings
  const [platformCommissionRate, setPlatformCommissionRate] = useState("10.00");
  const [clientFee, setClientFee] = useState("2.00");
  const [freelancerFee, setFreelancerFee] = useState("3.00");
  const [gstRate, setGstRate] = useState("18.00");
  const [taxesRate, setTaxesRate] = useState("2.00");
  const [withdrawalCharges, setWithdrawalCharges] = useState("1.00");
  const [internationalCharges, setInternationalCharges] = useState("5.00");
  const [referralBonus, setReferralBonus] = useState("50.00");

  // Commission Preview Calculator
  const [calcBudget, setCalcBudget] = useState("1000");
  const [calcResult, setCalcResult] = useState<any>(null);

  // Coupon Creation
  const [couponCode, setCouponCode] = useState("");
  const [couponType, setCouponType] = useState<"percent" | "fixed">("percent");
  const [couponValue, setCouponValue] = useState("");
  const [couponExpiry, setCouponExpiry] = useState("");
  const [couponLimit, setCouponLimit] = useState(100);
  const [couponCategory, setCouponCategory] = useState("");
  const [couponMinVal, setCouponMinVal] = useState("0");
  const [couponMaxDiscount, setCouponMaxDiscount] = useState("10000");

  // Job Featuring
  const [featJobId, setFeatJobId] = useState("");
  const [featPinned, setFeatPinned] = useState(false);
  const [featTrending, setFeatTrending] = useState(false);
  const [featUrgent, setFeatUrgent] = useState(false);
  const [featSponsored, setFeatSponsored] = useState(false);
  const [featExpiry, setFeatExpiry] = useState("");

  // Escrow Control Actions
  const [escrowActionModal, setEscrowActionModal] = useState(false);
  const [selectedEscrow, setSelectedEscrow] = useState<any>(null);
  const [escrowActionType, setEscrowActionType] = useState<"freeze" | "release" | "partial_release" | "refund" | "split" | "override">("release");
  const [escrowActionAmount, setEscrowActionAmount] = useState("");
  const [escrowActionReason, setEscrowActionReason] = useState("");

  // Notes addition
  const [noteType, setNoteType] = useState("user");
  const [noteEntityId, setNoteEntityId] = useState("");
  const [noteText, setNoteText] = useState("");

  // Announcement Creation
  const [annType, setAnnType] = useState<any>("homepage_banner");
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annTarget, setAnnTarget] = useState<any>("all");
  const [annExpiry, setAnnExpiry] = useState("");

  // Reject Withdrawal dialog notes
  const [rejectNotesMap, setRejectNotesMap] = useState<Record<number, string>>({});

  // Search/Filters states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Real-Time Websocket Connection
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    // Assume user exists or handle gracefully
    const wsUrl = `${protocol}//${host}:5000/realtime?userId=9999`; // Admin WS identifier
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (
          payload.type === "dashboard_update" ||
          payload.type === "commission_update" ||
          payload.type === "feature_flag_update" ||
          payload.type === "announcement_update"
        ) {
          // Refetch everything
          qc.invalidateQueries();
        }
      } catch (err) {}
    };

    return () => {
      ws.close();
    };
  }, [qc]);

  // Query stats
  const { data: analyticsData } = useQuery<any>({
    queryKey: ["admin-analytics"],
    queryFn: () => api.get<any>("/admin-enterprise/analytics")
  });

  // Query platform withdrawals (historical layout support)
  const { data: withdrawals = [], isLoading: isWithdrawalsLoading } = useQuery<any[]>({
    queryKey: ["admin-withdrawals"],
    queryFn: () => api.get<any[]>("/admin/withdrawals").catch(() => []),
  });

  // Query fraud logs
  const { data: fraudLogs = [] } = useQuery<any[]>({
    queryKey: ["admin-fraud-logs"],
    queryFn: () => api.get<any[]>("/admin-enterprise/fraud-logs")
  });

  // Query commission config
  const { data: commConfig } = useQuery<any>({
    queryKey: ["admin-commissions"],
    queryFn: () => api.get<any>("/admin-enterprise/commissions"),
  });

  useEffect(() => {
    if (commConfig) {
      setPlatformCommissionRate(String(commConfig.platformCommissionRate));
      setClientFee(String(commConfig.clientFee));
      setFreelancerFee(String(commConfig.freelancerFee));
      setGstRate(String(commConfig.gstRate));
      setTaxesRate(String(commConfig.taxesRate));
      setWithdrawalCharges(String(commConfig.withdrawalCharges));
      setInternationalCharges(String(commConfig.internationalCharges));
      setReferralBonus(String(commConfig.referralBonus));
    }
  }, [commConfig]);

  // Query referrals
  const { data: referrals = [] } = useQuery<any[]>({
    queryKey: ["admin-referrals"],
    queryFn: () => api.get<any[]>("/admin-enterprise/referrals")
  });

  // Query coupons
  const { data: coupons = [] } = useQuery<any[]>({
    queryKey: ["admin-coupons"],
    queryFn: () => api.get<any[]>("/admin-enterprise/coupons")
  });

  // Query featured jobs
  const { data: featuredJobs = [] } = useQuery<any[]>({
    queryKey: ["admin-featured-jobs"],
    queryFn: () => api.get<any[]>("/admin-enterprise/featured-jobs")
  });

  // Query escrow accounts
  const { data: escrowAccounts = [] } = useQuery<any[]>({
    queryKey: ["admin-escrow-list"],
    queryFn: () => api.get<any[]>("/admin-enterprise/escrow/list")
  });

  // Query escrow action logs
  const { data: escrowControlLogs = [] } = useQuery<any[]>({
    queryKey: ["admin-escrow-logs"],
    queryFn: () => api.get<any[]>("/admin-enterprise/escrow/logs")
  });

  // Query AI Moderation logs
  const { data: aiModerationLogs = [] } = useQuery<any[]>({
    queryKey: ["admin-ai-logs"],
    queryFn: () => api.get<any[]>("/admin-enterprise/ai-moderation/list")
  });

  // Query Announcements
  const { data: announcements = [] } = useQuery<any[]>({
    queryKey: ["admin-announcements"],
    queryFn: () => api.get<any[]>("/admin-enterprise/announcements")
  });

  // Query custom roles & permission matrix
  const { data: customRoles = [] } = useQuery<any[]>({
    queryKey: ["admin-roles"],
    queryFn: () => api.get<any[]>("/admin-enterprise/roles")
  });

  // Query Webhook center logs
  const { data: webhookLogs = [] } = useQuery<any[]>({
    queryKey: ["admin-webhooks"],
    queryFn: () => api.get<any[]>("/admin-enterprise/webhooks")
  });

  // Query backups
  const { data: backups = [] } = useQuery<any[]>({
    queryKey: ["admin-backups"],
    queryFn: () => api.get<any[]>("/admin-enterprise/backups")
  });

  // Query feature flags
  const { data: featureFlags = [] } = useQuery<any[]>({
    queryKey: ["admin-feature-flags"],
    queryFn: () => api.get<any[]>("/admin-enterprise/feature-flags")
  });

  // Query Admin audit trail logs
  const { data: auditLogs = [] } = useQuery<any[]>({
    queryKey: ["admin-audit-logs"],
    queryFn: () => api.get<any[]>("/admin-enterprise/audit-logs")
  });

  // Query system health
  const { data: healthChecks = [], refetch: refetchHealth } = useQuery<any[]>({
    queryKey: ["admin-system-health"],
    queryFn: () => api.get<any[]>("/admin-enterprise/system-health")
  });

  // Trigger preview calculator logic
  useEffect(() => {
    const budgetVal = Number(calcBudget);
    if (!isNaN(budgetVal) && budgetVal > 0) {
      const platCommission = budgetVal * (Number(platformCommissionRate) / 100);
      const cFee = budgetVal * (Number(clientFee) / 100);
      const fFee = budgetVal * (Number(freelancerFee) / 100);
      const gst = platCommission * (Number(gstRate) / 100);
      const taxes = platCommission * (Number(taxesRate) / 100);
      const totalClientCost = budgetVal + cFee;
      const netFreelancerPayout = budgetVal - fFee - platCommission - gst - taxes;

      setCalcResult({
        platCommission,
        cFee,
        fFee,
        gst,
        taxes,
        totalClientCost,
        netFreelancerPayout
      });
    }
  }, [calcBudget, platformCommissionRate, clientFee, freelancerFee, gstRate, taxesRate]);

  // Mutations
  const approveWithdrawMutation = useMutation({
    mutationFn: (id: number) => api.post(`/admin/withdrawals/${id}/approve`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      toast({ title: "Payout Processed", description: "Withdrawal transfer completed via RazorpayX." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to Process", description: err.message, variant: "destructive" });
    }
  });

  const rejectWithdrawMutation = useMutation({
    mutationFn: (data: { id: number; reason: string }) => api.post(`/admin/withdrawals/${data.id}/reject`, { reason: data.reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      toast({ title: "Payout Rejected", description: "Withdrawal request cancelled successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to Reject", description: err.message, variant: "destructive" });
    }
  });

  const fraudActionMutation = useMutation({
    mutationFn: (payload: any) => api.post("/admin-enterprise/fraud-logs/action", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-fraud-logs"] });
      toast({ title: "Fraud Action Logged", description: "Target status updated successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  });

  const updateCommissionMutation = useMutation({
    mutationFn: (payload: any) => api.post("/admin-enterprise/commissions", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-commissions"] });
      toast({ title: "Commission Saved", description: "Settings updated immediately across newly created jobs." });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  });

  const referralActionMutation = useMutation({
    mutationFn: (payload: any) => api.post("/admin-enterprise/referrals/action", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-referrals"] });
      toast({ title: "Referral updated", description: "Action processed successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  });

  const createCouponMutation = useMutation({
    mutationFn: (payload: any) => api.post("/admin-enterprise/coupons", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      setCouponCode("");
      setCouponValue("");
      setCouponExpiry("");
      toast({ title: "Coupon Created", description: "Voucher code generated successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  });

  const toggleCouponMutation = useMutation({
    mutationFn: (id: number) => api.post(`/admin-enterprise/coupons/${id}/toggle`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: "Coupon Status Toggled" });
    }
  });

  const deleteCouponMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin-enterprise/coupons/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: "Coupon Deleted" });
    }
  });

  const createFeaturedJobMutation = useMutation({
    mutationFn: (payload: any) => api.post("/admin-enterprise/featured-jobs", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-featured-jobs"] });
      setFeatJobId("");
      setFeatPinned(false);
      setFeatTrending(false);
      setFeatUrgent(false);
      setFeatSponsored(false);
      setFeatExpiry("");
      toast({ title: "Visibility Boosted", description: "Promotions scheduled successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to promote", description: err.message, variant: "destructive" });
    }
  });

  const deleteFeaturedJobMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin-enterprise/featured-jobs/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-featured-jobs"] });
      toast({ title: "Promotions Stopped" });
    }
  });

  const escrowActionMutation = useMutation({
    mutationFn: (payload: any) => api.post("/admin-enterprise/escrow/action", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-escrow-list"] });
      qc.invalidateQueries({ queryKey: ["admin-escrow-logs"] });
      setEscrowActionModal(false);
      setEscrowActionAmount("");
      setEscrowActionReason("");
      toast({ title: "Action Processed", description: "Escrow balances modified immediately." });
    },
    onError: (err: any) => {
      toast({ title: "Failed override", description: err.message, variant: "destructive" });
    }
  });

  const moderationActionMutation = useMutation({
    mutationFn: (payload: any) => api.post("/admin-enterprise/ai-moderation/action", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ai-logs"] });
      toast({ title: "Action Logged", description: "Entity updated successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  });

  const createAnnMutation = useMutation({
    mutationFn: (payload: any) => api.post("/admin-enterprise/announcements", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-announcements"] });
      setAnnTitle("");
      setAnnContent("");
      setAnnExpiry("");
      toast({ title: "Announcement Published", description: "Banners updated live on platform." });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  });

  const deleteAnnMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin-enterprise/announcements/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-announcements"] });
      toast({ title: "Announcement Removed" });
    }
  });

  const addNoteMutation = useMutation({
    mutationFn: (payload: any) => api.post("/admin-enterprise/notes", payload),
    onSuccess: () => {
      setNoteText("");
      toast({ title: "Note Saved", description: "Internal notes logged under record ID." });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: (payload: any) => api.post("/admin-enterprise/roles", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
      toast({ title: "RBAC Updated", description: "Permissions matrix updated immediately." });
    }
  });

  const runBackupMutation = useMutation({
    mutationFn: (payload: any) => api.post("/admin-enterprise/backups/run", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-backups"] });
      toast({ title: "Backup Completed", description: "Database snapshot written to backups disk folder." });
    }
  });

  const toggleFlagMutation = useMutation({
    mutationFn: (payload: any) => api.post("/admin-enterprise/feature-flags/toggle", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-feature-flags"] });
      toast({ title: "Flag updated", description: "WS notifications dispatched to clients." });
    }
  });

  // Calculate platform metrics
  const pendingPayouts = withdrawals.filter((w: any) => w.status === "pending");
  const filteredWithdrawals = withdrawals.filter((w: any) => {
    const q = searchQuery.toLowerCase();
    const matchQ =
      w.bankAccount?.holderName?.toLowerCase().includes(q) ||
      w.bankAccount?.bankName?.toLowerCase().includes(q) ||
      w.status?.toLowerCase().includes(q) ||
      String(w.amount).includes(q);
    
    if (statusFilter === "all") return matchQ;
    return matchQ && w.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-md">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">FinTrust+ Enterprise Admin</h1>
              <p className="text-xs text-slate-400 font-medium">Control Center • Connected to Production PostgreSQL</p>
            </div>
          </div>
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 rounded-full font-bold px-3 py-1 text-xs">
            Live Synchronized
          </Badge>
        </div>

        {/* Layout Grid */}
        <div className="grid lg:grid-cols-4 gap-8">
          
          {/* Navigation Left Sidebar */}
          <div className="space-y-4">
            <Card className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden py-3">
              <nav className="flex flex-col">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold border-l-4 transition-colors ${
                    activeTab === "overview"
                      ? "border-slate-900 bg-slate-50 text-slate-900"
                      : "border-transparent text-slate-400 hover:bg-slate-50/50 hover:text-slate-700"
                  }`}
                >
                  <Activity className="h-4 w-4" /> Live Overview
                </button>
                <button
                  onClick={() => setActiveTab("fraud")}
                  className={`flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold border-l-4 transition-colors ${
                    activeTab === "fraud"
                      ? "border-slate-900 bg-slate-50 text-slate-900"
                      : "border-transparent text-slate-400 hover:bg-slate-50/50 hover:text-slate-700"
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" /> Fraud Center
                </button>
                <button
                  onClick={() => setActiveTab("commissions")}
                  className={`flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold border-l-4 transition-colors ${
                    activeTab === "commissions"
                      ? "border-slate-900 bg-slate-50 text-slate-900"
                      : "border-transparent text-slate-400 hover:bg-slate-50/50 hover:text-slate-700"
                  }`}
                >
                  <Percent className="h-4 w-4" /> Commissions
                </button>
                <button
                  onClick={() => setActiveTab("referrals_coupons")}
                  className={`flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold border-l-4 transition-colors ${
                    activeTab === "referrals_coupons"
                      ? "border-slate-900 bg-slate-50 text-slate-900"
                      : "border-transparent text-slate-400 hover:bg-slate-50/50 hover:text-slate-700"
                  }`}
                >
                  <Tag className="h-4 w-4" /> Referrals & Coupons
                </button>
                <button
                  onClick={() => setActiveTab("featured_jobs")}
                  className={`flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold border-l-4 transition-colors ${
                    activeTab === "featured_jobs"
                      ? "border-slate-900 bg-slate-50 text-slate-900"
                      : "border-transparent text-slate-400 hover:bg-slate-50/50 hover:text-slate-700"
                  }`}
                >
                  <TrendingUp className="h-4 w-4" /> Featured Jobs
                </button>
                <button
                  onClick={() => setActiveTab("escrow")}
                  className={`flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold border-l-4 transition-colors ${
                    activeTab === "escrow"
                      ? "border-slate-900 bg-slate-50 text-slate-900"
                      : "border-transparent text-slate-400 hover:bg-slate-50/50 hover:text-slate-700"
                  }`}
                >
                  <Lock className="h-4 w-4" /> Escrow Controls
                </button>
                <button
                  onClick={() => setActiveTab("ai")}
                  className={`flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold border-l-4 transition-colors ${
                    activeTab === "ai"
                      ? "border-slate-900 bg-slate-50 text-slate-900"
                      : "border-transparent text-slate-400 hover:bg-slate-50/50 hover:text-slate-700"
                  }`}
                >
                  <Server className="h-4 w-4" /> AI Moderation
                </button>
                <button
                  onClick={() => setActiveTab("announcements")}
                  className={`flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold border-l-4 transition-colors ${
                    activeTab === "announcements"
                      ? "border-slate-900 bg-slate-50 text-slate-900"
                      : "border-transparent text-slate-400 hover:bg-slate-50/50 hover:text-slate-700"
                  }`}
                >
                  <Megaphone className="h-4 w-4" /> Announcements
                </button>
                <button
                  onClick={() => setActiveTab("notes_roles")}
                  className={`flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold border-l-4 transition-colors ${
                    activeTab === "notes_roles"
                      ? "border-slate-900 bg-slate-50 text-slate-900"
                      : "border-transparent text-slate-400 hover:bg-slate-50/50 hover:text-slate-700"
                  }`}
                >
                  <Key className="h-4 w-4" /> Notes & Roles
                </button>
                <button
                  onClick={() => setActiveTab("logs_backups")}
                  className={`flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold border-l-4 transition-colors ${
                    activeTab === "logs_backups"
                      ? "border-slate-900 bg-slate-50 text-slate-900"
                      : "border-transparent text-slate-400 hover:bg-slate-50/50 hover:text-slate-700"
                  }`}
                >
                  <Database className="h-4 w-4" /> Logs & Backups
                </button>
                <button
                  onClick={() => setActiveTab("flags_audit")}
                  className={`flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold border-l-4 transition-colors ${
                    activeTab === "flags_audit"
                      ? "border-slate-900 bg-slate-50 text-slate-900"
                      : "border-transparent text-slate-400 hover:bg-slate-50/50 hover:text-slate-700"
                  }`}
                >
                  <Globe className="h-4 w-4" /> Flags & Audit Logs
                </button>
              </nav>
            </Card>

            {/* Quick platform status details */}
            <Card className="border-0 shadow-sm bg-white rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Live Channels</h4>
              <div className="space-y-2 text-xs font-medium text-slate-600">
                <div className="flex justify-between items-center">
                  <span>API Server</span>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 py-0 px-2">Online</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Realtime Pub/Sub</span>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 py-0 px-2">Connected</Badge>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Side Content Pane */}
          <div className="lg:col-span-3 space-y-6">
            <AnimatePresence mode="wait">
              {activeTab === "overview" && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-0 shadow-sm rounded-2xl bg-white p-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-blue-50">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="text-2xl font-bold tracking-tight">{analyticsData?.summary?.users?.total ?? 0}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Platform Users</div>
                    </Card>

                    <Card className="border-0 shadow-sm rounded-2xl bg-white p-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-emerald-50">
                        <Shield className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-bold tracking-tight">${analyticsData?.summary?.escrowLocked ?? 0}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Escrow Locked</div>
                    </Card>

                    <Card className="border-0 shadow-sm rounded-2xl bg-white p-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-indigo-50">
                        <DollarSign className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div className="text-2xl font-bold tracking-tight">${analyticsData?.summary?.transactionVolume ?? 0}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Total Payouts</div>
                    </Card>

                    <Card className="border-0 shadow-sm rounded-2xl bg-white p-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-purple-50">
                        <Briefcase className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="text-2xl font-bold tracking-tight">{analyticsData?.summary?.projects?.active ?? 0}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Active Projects</div>
                    </Card>
                  </div>

                  {/* Charts */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="border-0 shadow-sm rounded-2xl bg-white p-5 space-y-4">
                      <h4 className="text-sm font-bold text-slate-700">Financial Volumes (USD)</h4>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={analyticsData?.charts?.revenueHistory ?? []}>
                            <defs>
                              <linearGradient id="colorEscrow" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                            <ChartTooltip />
                            <Area type="monotone" dataKey="escrow" stroke="#4f46e5" fillOpacity={1} fill="url(#colorEscrow)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>

                    <Card className="border-0 shadow-sm rounded-2xl bg-white p-5 space-y-4">
                      <h4 className="text-sm font-bold text-slate-700">User Growth History</h4>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analyticsData?.charts?.userGrowth ?? []}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                            <ChartTooltip />
                            <Bar dataKey="freelancers" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="clients" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </div>

                  {/* Payouts Processing Queue */}
                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-base font-bold">Freelancer Withdrawal Requests</CardTitle>
                        <CardDescription className="text-xs mt-1 text-slate-400">Review pending Razorpay payout transfers.</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Search payouts..."
                          value={searchQuery}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                          className="rounded-xl h-8 max-w-[200px]"
                        />
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="h-8 w-[120px] rounded-xl">
                            <SelectValue placeholder="Filter Status" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="successful">Success</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-black">
                            <th className="py-3">Recipient / Account</th>
                            <th className="py-3">Amount</th>
                            <th className="py-3">Method</th>
                            <th className="py-3">Status</th>
                            <th className="py-3">Date</th>
                            <th className="py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-xs">
                          {filteredWithdrawals.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400">No withdrawal requests found.</td>
                            </tr>
                          ) : (
                            filteredWithdrawals.map((w: any) => (
                              <tr key={w.id}>
                                <td className="py-3">
                                  <div className="font-bold text-slate-800">{w.bankAccount?.holderName || "Unknown"}</div>
                                  <div className="text-[10px] text-slate-400">A/C: {w.bankAccount?.accountNumber} ({w.bankAccount?.ifsc})</div>
                                </td>
                                <td className="py-3 font-semibold text-slate-700">${w.amount}</td>
                                <td className="py-3 capitalize text-slate-500">{w.payoutMethod || "Bank Transfer"}</td>
                                <td className="py-3">
                                  <Badge className={`border-0 rounded-full text-[9px] font-bold ${
                                    w.status === "successful" ? "bg-green-100 text-green-700" :
                                    w.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                                  }`}>
                                    {w.status}
                                  </Badge>
                                </td>
                                <td className="py-3 text-slate-400">{new Date(w.createdAt).toLocaleDateString()}</td>
                                <td className="py-3 text-right">
                                  {w.status === "pending" && (
                                    <div className="flex justify-end gap-1.5">
                                      <Button
                                        onClick={() => approveWithdrawMutation.mutate(w.id)}
                                        disabled={approveWithdrawMutation.isPending}
                                        size="sm"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-7 px-2.5 text-[10px] font-bold"
                                      >
                                        Approve
                                      </Button>
                                      <div className="flex gap-1">
                                        <Input
                                          placeholder="Reject reason..."
                                          value={rejectNotesMap[w.id] || ""}
                                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRejectNotesMap({ ...rejectNotesMap, [w.id]: e.target.value })}
                                          className="h-7 text-[10px] rounded-lg max-w-[120px]"
                                        />
                                        <Button
                                          onClick={() => rejectWithdrawMutation.mutate({ id: w.id, reason: rejectNotesMap[w.id] || "Rejected by admin" })}
                                          disabled={rejectWithdrawMutation.isPending}
                                          size="sm"
                                          className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-7 px-2 text-[10px] font-bold"
                                        >
                                          Reject
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </motion.div>
              )}

              {activeTab === "fraud" && (
                <motion.div
                  key="fraud"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                >
                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6">
                    <div>
                      <CardTitle className="text-base font-bold">Fraud & Risk Detection Center</CardTitle>
                      <CardDescription className="text-xs mt-1 text-slate-400">Automated audit matches for duplicate IDs, devices, and frozen funds.</CardDescription>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-black">
                            <th className="py-3">Trigger Alert</th>
                            <th className="py-3">Target Details</th>
                            <th className="py-3">Severity</th>
                            <th className="py-3">Device / IP</th>
                            <th className="py-3">Date</th>
                            <th className="py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-xs">
                          {fraudLogs.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400">No fraud indicators detected in this cycle.</td>
                            </tr>
                          ) : (
                            fraudLogs.map((log: any) => (
                              <tr key={log.id}>
                                <td className="py-3">
                                  <div className="font-bold text-slate-800 capitalize">{log.type.replace(/_/g, " ")}</div>
                                  <div className="text-[10px] text-red-600 bg-red-50 py-0.5 px-2 rounded-full inline-block mt-0.5 font-bold uppercase">{log.status}</div>
                                </td>
                                <td className="py-3">
                                  <span className="font-semibold text-slate-600">ID #{log.targetId}</span>
                                  <p className="text-[10px] text-slate-400 max-w-[200px] truncate">{log.details}</p>
                                </td>
                                <td className="py-3">
                                  <Badge className={`border-0 rounded-full text-[9px] font-bold ${
                                    log.severity === "high" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                                  }`}>
                                    {log.severity}
                                  </Badge>
                                </td>
                                <td className="py-3">
                                  <div className="text-slate-600 font-medium">{log.ipAddress || "0.0.0.0"}</div>
                                  <div className="text-[9px] text-slate-400 font-mono">{log.fingerprint || "no-hash"}</div>
                                </td>
                                <td className="py-3 text-slate-400">{new Date(log.createdAt).toLocaleDateString()}</td>
                                <td className="py-3 text-right space-x-1">
                                  <Button
                                    onClick={() => fraudActionMutation.mutate({ logId: log.id, action: "ban", reason: "Automated risk ban" })}
                                    size="sm"
                                    className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-7 px-2.5 text-[9px] font-bold"
                                  >
                                    Ban
                                  </Button>
                                  <Button
                                    onClick={() => fraudActionMutation.mutate({ logId: log.id, action: "freeze_wallet", reason: "Risk investigation" })}
                                    size="sm"
                                    className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl h-7 px-2.5 text-[9px] font-bold"
                                  >
                                    Freeze Wallet
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </motion.div>
              )}

              {activeTab === "commissions" && (
                <motion.div
                  key="commissions"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6">
                    <div>
                      <CardTitle className="text-base font-bold">Commission Engine Configuration</CardTitle>
                      <CardDescription className="text-xs mt-1 text-slate-400">Configure global transaction costs and fees applied immediately.</CardDescription>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <Label>Platform Commission Rate (%)</Label>
                        <Input value={platformCommissionRate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlatformCommissionRate(e.target.value)} className="rounded-xl" />
                      </div>

                      <div className="space-y-1">
                        <Label>Client Platform Fee (%)</Label>
                        <Input value={clientFee} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientFee(e.target.value)} className="rounded-xl" />
                      </div>

                      <div className="space-y-1">
                        <Label>Freelancer Platform Fee (%)</Label>
                        <Input value={freelancerFee} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFreelancerFee(e.target.value)} className="rounded-xl" />
                      </div>

                      <div className="space-y-1">
                        <Label>GST on Commissions (%)</Label>
                        <Input value={gstRate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGstRate(e.target.value)} className="rounded-xl" />
                      </div>

                      <div className="space-y-1">
                        <Label>TDS on Releases (%)</Label>
                        <Input value={taxesRate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTaxesRate(e.target.value)} className="rounded-xl" />
                      </div>

                      <div className="space-y-1">
                        <Label>Withdrawal Processing Charges ($)</Label>
                        <Input value={withdrawalCharges} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWithdrawalCharges(e.target.value)} className="rounded-xl" />
                      </div>

                      <div className="space-y-1">
                        <Label>International Surcharge ($)</Label>
                        <Input value={internationalCharges} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInternationalCharges(e.target.value)} className="rounded-xl" />
                      </div>

                      <div className="space-y-1">
                        <Label>Referral Bonus Amount ($)</Label>
                        <Input value={referralBonus} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReferralBonus(e.target.value)} className="rounded-xl" />
                      </div>
                    </div>

                    <Button
                      onClick={() => updateCommissionMutation.mutate({
                        platformCommissionRate,
                        clientFee,
                        freelancerFee,
                        gstRate,
                        taxesRate,
                        withdrawalCharges,
                        internationalCharges,
                        referralBonus
                      })}
                      className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs h-9 px-4"
                    >
                      Save Configuration
                    </Button>
                  </Card>

                  {/* Calculator preview */}
                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-4">
                    <h4 className="text-sm font-bold text-slate-700">Commission Preview Calculator</h4>
                    <div className="flex gap-4 items-end">
                      <div className="space-y-1 max-w-[200px]">
                        <Label>Simulated Budget ($)</Label>
                        <Input type="number" value={calcBudget} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCalcBudget(e.target.value)} className="rounded-xl h-9" />
                      </div>
                    </div>

                    {calcResult && (
                      <div className="grid md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs font-semibold text-slate-600">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Platform Cut ({platformCommissionRate}%)</span>
                            <span className="text-slate-800">${calcResult.platCommission.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Client Fee ({clientFee}%)</span>
                            <span className="text-slate-800">${calcResult.cFee.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Freelancer Fee ({freelancerFee}%)</span>
                            <span className="text-slate-800">${calcResult.fFee.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0 md:pl-4">
                          <div className="flex justify-between">
                            <span>GST on Commissions ({gstRate}%)</span>
                            <span className="text-slate-800">${calcResult.gst.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-emerald-600 font-bold">
                            <span>Net Freelancer Payout</span>
                            <span>${calcResult.netFreelancerPayout.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-indigo-600 font-bold">
                            <span>Total Client Billing</span>
                            <span>${calcResult.totalClientCost.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>
              )}

              {activeTab === "referrals_coupons" && (
                <motion.div
                  key="referrals_coupons"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <div className="flex gap-2 border-b border-slate-200">
                    <button
                      onClick={() => setRefCouponsSubTab("referrals")}
                      className={`pb-2 px-4 text-xs font-bold transition-colors ${
                        refCouponsSubTab === "referrals" ? "border-b-2 border-slate-900 text-slate-800" : "text-slate-400"
                      }`}
                    >
                      Referrals List
                    </button>
                    <button
                      onClick={() => setRefCouponsSubTab("coupons")}
                      className={`pb-2 px-4 text-xs font-bold transition-colors ${
                        refCouponsSubTab === "coupons" ? "border-b-2 border-slate-900 text-slate-800" : "text-slate-400"
                      }`}
                    >
                      Coupons Code Management
                    </button>
                  </div>

                  {refCouponsSubTab === "referrals" ? (
                    <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6">
                      <h3 className="text-sm font-bold text-slate-800">Invited Referrals History</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-black">
                              <th className="py-3">Referrer User</th>
                              <th className="py-3">Referee User</th>
                              <th className="py-3">Reward Value</th>
                              <th className="py-3">Status</th>
                              <th className="py-3">Date</th>
                              <th className="py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 text-xs">
                            {referrals.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-slate-400">No referral logs found.</td>
                              </tr>
                            ) : (
                              referrals.map((r: any) => (
                                <tr key={r.id}>
                                  <td className="py-3 font-bold text-slate-800">{r.referrerName} ({r.referrerEmail})</td>
                                  <td className="py-3 text-slate-600">{r.refereeName} ({r.refereeEmail})</td>
                                  <td className="py-3 font-semibold text-slate-700">${r.rewardAmount}</td>
                                  <td className="py-3">
                                    <Badge className={`border-0 rounded-full text-[9px] font-bold ${
                                      r.status === "completed" ? "bg-green-100 text-green-700" :
                                      r.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                                    }`}>
                                      {r.status}
                                    </Badge>
                                  </td>
                                  <td className="py-3 text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</td>
                                  <td className="py-3 text-right">
                                    {r.status === "pending" && (
                                      <div className="flex justify-end gap-1.5">
                                        <Button
                                          onClick={() => referralActionMutation.mutate({ referralId: r.id, action: "approve" })}
                                          size="sm"
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-7 px-2.5 text-[10px] font-bold"
                                        >
                                          Approve Reward
                                        </Button>
                                        <Button
                                          onClick={() => referralActionMutation.mutate({ referralId: r.id, action: "reject" })}
                                          size="sm"
                                          className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-7 px-2 text-[10px] font-bold"
                                        >
                                          Reject
                                        </Button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  ) : (
                    <div className="space-y-6">
                      <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6">
                        <h3 className="text-sm font-bold text-slate-800">Generate Coupon Voucher</h3>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <Label>Coupon Code</Label>
                            <Input value={couponCode} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCouponCode(e.target.value)} placeholder="SUMMER20" className="rounded-xl" />
                          </div>
                          <div className="space-y-1">
                            <Label>Discount Type</Label>
                            <Select value={couponType} onValueChange={(v: any) => setCouponType(v)}>
                              <SelectTrigger className="rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white">
                                <SelectItem value="percent">Percent (%)</SelectItem>
                                <SelectItem value="fixed">Fixed ($ USD)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label>Value</Label>
                            <Input value={couponValue} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCouponValue(e.target.value)} placeholder="15" className="rounded-xl" />
                          </div>
                          <div className="space-y-1">
                            <Label>Expiry Date</Label>
                            <Input type="date" value={couponExpiry} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCouponExpiry(e.target.value)} className="rounded-xl" />
                          </div>
                          <div className="space-y-1">
                            <Label>Usage Limit</Label>
                            <Input type="number" value={couponLimit} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCouponLimit(Number(e.target.value))} className="rounded-xl" />
                          </div>
                        </div>
                        <Button
                          onClick={() => createCouponMutation.mutate({
                            code: couponCode,
                            discountType: couponType,
                            discountValue: couponValue,
                            expiryDate: couponExpiry,
                            usageLimit: couponLimit,
                            categoryRestriction: couponCategory || undefined,
                            minProjectValue: couponMinVal,
                            maxDiscount: couponMaxDiscount
                          })}
                          className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs h-9 px-4"
                        >
                          Create Coupon
                        </Button>
                      </Card>

                      <Card className="border-0 shadow-sm rounded-2xl bg-white p-6">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-black">
                                <th className="py-3">Voucher Code</th>
                                <th className="py-3">Discount</th>
                                <th className="py-3">Usage</th>
                                <th className="py-3">Expires</th>
                                <th className="py-3">Status</th>
                                <th className="py-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-xs">
                              {coupons.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="py-8 text-center text-slate-400">No active coupons.</td>
                                </tr>
                              ) : (
                                coupons.map((c: any) => (
                                  <tr key={c.id}>
                                    <td className="py-3 font-bold text-slate-800">{c.code}</td>
                                    <td className="py-3 font-semibold text-slate-600">
                                      {c.discountType === "percent" ? `${c.discountValue}%` : `$${c.discountValue}`}
                                    </td>
                                    <td className="py-3 font-medium text-slate-500">{c.usageCount} / {c.usageLimit}</td>
                                    <td className="py-3 text-slate-400">{new Date(c.expiryDate).toLocaleDateString()}</td>
                                    <td className="py-3">
                                      <Badge className={`border-0 rounded-full text-[9px] font-bold ${
                                        c.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                      }`}>
                                        {c.status}
                                      </Badge>
                                    </td>
                                    <td className="py-3 text-right space-x-1.5">
                                      <Button
                                        onClick={() => toggleCouponMutation.mutate(c.id)}
                                        variant="outline"
                                        className="h-7 text-[10px] rounded-xl font-bold"
                                      >
                                        Toggle
                                      </Button>
                                      <Button
                                        onClick={() => deleteCouponMutation.mutate(c.id)}
                                        variant="ghost"
                                        className="h-7 text-red-500 hover:text-red-700 p-0"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "featured_jobs" && (
                <motion.div
                  key="featured_jobs"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6">
                    <h3 className="text-sm font-bold text-slate-800">Promote Job Listing</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Target Job ID</Label>
                        <Input value={featJobId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFeatJobId(e.target.value)} placeholder="Job ID number" className="rounded-xl" />
                      </div>
                      <div className="space-y-1">
                        <Label>Promotion Expiry Date</Label>
                        <Input type="date" value={featExpiry} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFeatExpiry(e.target.value)} className="rounded-xl" />
                      </div>

                      <div className="md:col-span-2 flex flex-wrap gap-6 items-center py-2 bg-slate-50 p-4 rounded-xl">
                        <div className="flex items-center gap-2">
                          <Switch checked={featPinned} onCheckedChange={setFeatPinned} />
                          <Label className="text-xs font-semibold text-slate-700">Pin Job to Top</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={featTrending} onCheckedChange={setFeatTrending} />
                          <Label className="text-xs font-semibold text-slate-700">Mark Trending</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={featUrgent} onCheckedChange={setFeatUrgent} />
                          <Label className="text-xs font-semibold text-slate-700">Mark Urgent</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={featSponsored} onCheckedChange={setFeatSponsored} />
                          <Label className="text-xs font-semibold text-slate-700">Sponsored Tag</Label>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => createFeaturedJobMutation.mutate({
                        jobId: Number(featJobId),
                        isPinned: featPinned,
                        isTrending: featTrending,
                        isUrgent: featUrgent,
                        isSponsored: featSponsored,
                        expiryDate: featExpiry
                      })}
                      className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs h-9 px-4"
                    >
                      Promote Job
                    </Button>
                  </Card>

                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6">
                    <h3 className="text-sm font-bold text-slate-800 mb-4">Promoted Visibility Jobs</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-black">
                            <th className="py-3">Job ID</th>
                            <th className="py-3">Title</th>
                            <th className="py-3">Active Promos</th>
                            <th className="py-3">Expires</th>
                            <th className="py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-xs">
                          {featuredJobs.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-400">No boosted listings active.</td>
                            </tr>
                          ) : (
                            featuredJobs.map((f: any) => (
                              <tr key={f.id}>
                                <td className="py-3 font-bold text-slate-700">#{f.jobId}</td>
                                <td className="py-3 font-semibold text-slate-800">{f.jobTitle}</td>
                                <td className="py-3">
                                  <div className="flex flex-wrap gap-1">
                                    {f.isPinned && <Badge variant="outline" className="text-[9px] border-slate-200">Pinned</Badge>}
                                    {f.isTrending && <Badge variant="outline" className="text-[9px] border-slate-200">Trending</Badge>}
                                    {f.isUrgent && <Badge variant="outline" className="text-[9px] border-slate-200">Urgent</Badge>}
                                    {f.isSponsored && <Badge variant="outline" className="text-[9px] border-slate-200">Sponsored</Badge>}
                                  </div>
                                </td>
                                <td className="py-3 text-slate-400">{new Date(f.expiryDate).toLocaleDateString()}</td>
                                <td className="py-3 text-right">
                                  <Button
                                    onClick={() => deleteFeaturedJobMutation.mutate(f.id)}
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-[10px] text-red-600 hover:text-red-700 rounded-xl"
                                  >
                                    Remove Promos
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </motion.div>
              )}

              {activeTab === "escrow" && (
                <motion.div
                  key="escrow"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6">
                    <div>
                      <CardTitle className="text-base font-bold">Smart Escrow Control Center</CardTitle>
                      <CardDescription className="text-xs mt-1 text-slate-400">Platform-wide contract budget override dashboard.</CardDescription>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-black">
                            <th className="py-3">Project</th>
                            <th className="py-3">Client</th>
                            <th className="py-3">Freelancer</th>
                            <th className="py-3">Funds (Locked / Out)</th>
                            <th className="py-3">Status</th>
                            <th className="py-3 text-right">Override Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-xs">
                          {escrowAccounts.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400">No active escrow ledger accounts.</td>
                            </tr>
                          ) : (
                            escrowAccounts.map((e: any) => {
                              const remaining = Number(e.totalAmount) - Number(e.releasedAmount) - Number(e.refundedAmount);
                              return (
                                <tr key={e.id}>
                                  <td className="py-3 font-bold text-slate-800">{e.projectTitle}</td>
                                  <td className="py-3 text-slate-600">{e.clientName}</td>
                                  <td className="py-3 text-slate-600">{e.freelancerName}</td>
                                  <td className="py-3">
                                    <div className="font-semibold text-slate-700">Remaining: ${remaining}</div>
                                    <div className="text-[10px] text-slate-400">Budget: ${e.totalAmount} (Released: ${e.releasedAmount})</div>
                                  </td>
                                  <td className="py-3">
                                    <Badge className={`border-0 rounded-full text-[9px] font-bold ${
                                      e.status === "funded" ? "bg-green-100 text-green-700" :
                                      e.status === "frozen" ? "bg-red-100 text-red-700 text-red-700" : "bg-slate-100 text-slate-700"
                                    }`}>
                                      {e.status}
                                    </Badge>
                                  </td>
                                  <td className="py-3 text-right">
                                    <Button
                                      onClick={() => {
                                        setSelectedEscrow(e);
                                        setEscrowActionType("release");
                                        setEscrowActionAmount(String(remaining));
                                        setEscrowActionModal(true);
                                      }}
                                      size="sm"
                                      className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-7 px-2.5 text-[10px] font-bold"
                                    >
                                      Override
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  {/* Override logs */}
                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6">
                    <h3 className="text-sm font-bold text-slate-800 mb-4">Escrow Ledger Action Log Trail</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-black">
                            <th className="py-3">Escrow ID</th>
                            <th className="py-3">Action</th>
                            <th className="py-3">Amount</th>
                            <th className="py-3">Reason</th>
                            <th className="py-3">Admin</th>
                            <th className="py-3">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-xs">
                          {escrowControlLogs.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400">No escrow override audits recorded.</td>
                            </tr>
                          ) : (
                            escrowControlLogs.map((log: any) => (
                              <tr key={log.id}>
                                <td className="py-3 font-bold text-slate-700">#{log.escrowId}</td>
                                <td className="py-3 capitalize font-semibold text-slate-800">{log.action.replace(/_/g, " ")}</td>
                                <td className="py-3 font-semibold text-slate-700">${log.amount}</td>
                                <td className="py-3 text-slate-500 max-w-[200px] truncate">{log.reason}</td>
                                <td className="py-3 text-slate-600 font-bold">Admin ID #{log.adminId}</td>
                                <td className="py-3 text-slate-400">{new Date(log.createdAt).toLocaleDateString()}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  {/* Override Modal */}
                  <Dialog open={escrowActionModal} onOpenChange={setEscrowActionModal}>
                    <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6">
                      <DialogHeader>
                        <DialogTitle>Admin Override Transaction</DialogTitle>
                        <DialogDescription>Modify smart contract escrow state immediately.</DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4 py-2 text-xs font-semibold text-slate-600">
                        <div className="space-y-1">
                          <Label>Select Action</Label>
                          <Select value={escrowActionType} onValueChange={(v: any) => setEscrowActionType(v)}>
                            <SelectTrigger className="rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              <SelectItem value="release">Release Funds</SelectItem>
                              <SelectItem value="partial_release">Partial Release</SelectItem>
                              <SelectItem value="refund">Refund Client</SelectItem>
                              <SelectItem value="freeze">Freeze Escrow</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label>Action Amount ($ USD)</Label>
                          <Input value={escrowActionAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEscrowActionAmount(e.target.value)} className="rounded-xl" />
                        </div>

                        <div className="space-y-1">
                          <Label>Reason Log Note</Label>
                          <Textarea value={escrowActionReason} onChange={(e) => setEscrowActionReason(e.target.value)} placeholder="State audit reason..." className="rounded-xl min-h-[60px]" />
                        </div>
                      </div>

                      <DialogFooter>
                        <Button variant="ghost" onClick={() => setEscrowActionModal(false)} className="rounded-xl">Cancel</Button>
                        <Button
                          onClick={() => escrowActionMutation.mutate({
                            escrowId: selectedEscrow?.id,
                            action: escrowActionType,
                            amount: escrowActionAmount,
                            reason: escrowActionReason
                          })}
                          disabled={escrowActionMutation.isPending}
                          className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl"
                        >
                          Execute Override
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </motion.div>
              )}

              {activeTab === "ai" && (
                <motion.div
                  key="ai"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                >
                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6">
                    <div>
                      <CardTitle className="text-base font-bold">AI Content Moderation Center</CardTitle>
                      <CardDescription className="text-xs mt-1 text-slate-400">Review flagged spam, abusive chats, scam bids and duplicate postings.</CardDescription>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-black">
                            <th className="py-3">Flagged Entity</th>
                            <th className="py-3">Text Content</th>
                            <th className="py-3">Risk Confidence</th>
                            <th className="py-3">Flagged Words</th>
                            <th className="py-3">Status</th>
                            <th className="py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-xs">
                          {aiModerationLogs.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400">No content flag alerts. AI scan status is clear.</td>
                            </tr>
                          ) : (
                            aiModerationLogs.map((log: any) => (
                              <tr key={log.id}>
                                <td className="py-3">
                                  <div className="font-bold text-slate-800 capitalize">{log.entityType}</div>
                                  <div className="text-[10px] text-slate-400">ID #{log.entityId}</div>
                                </td>
                                <td className="py-3 max-w-[200px] truncate text-slate-600 font-medium">{log.textContent}</td>
                                <td className="py-3">
                                  <div className="font-bold text-red-600">Spam: {Math.round(Number(log.spamScore) * 100)}%</div>
                                  <div className="text-[10px] text-slate-400">Confidence: {Math.round(Number(log.confidence) * 100)}%</div>
                                </td>
                                <td className="py-3 font-mono text-[10px] text-orange-600">{log.flaggedWords || "None"}</td>
                                <td className="py-3 capitalize">
                                  <Badge className={`border-0 rounded-full text-[9px] font-bold ${
                                    log.status === "approved" ? "bg-green-100 text-green-700" :
                                    log.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                                  }`}>
                                    {log.status}
                                  </Badge>
                                </td>
                                <td className="py-3 text-right space-x-1">
                                  {log.status === "flagged" && (
                                    <>
                                      <Button
                                        onClick={() => moderationActionMutation.mutate({ id: log.id, action: "approve" })}
                                        size="sm"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-7 px-2 text-[10px] font-bold"
                                      >
                                        Approve
                                      </Button>
                                      <Button
                                        onClick={() => moderationActionMutation.mutate({ id: log.id, action: "delete" })}
                                        size="sm"
                                        className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-7 px-2 text-[10px] font-bold"
                                      >
                                        Delete
                                      </Button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </motion.div>
              )}

              {activeTab === "announcements" && (
                <motion.div
                  key="announcements"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6">
                    <h3 className="text-sm font-bold text-slate-800">Broadcast Announcement Notification</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Banner Placement Type</Label>
                        <Select value={annType} onValueChange={(v: any) => setAnnType(v)}>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="homepage_banner">Homepage Top Banner</SelectItem>
                            <SelectItem value="dashboard_banner">User Dashboard Alert</SelectItem>
                            <SelectItem value="maintenance_banner">Scheduled Maintenance Banner</SelectItem>
                            <SelectItem value="popup">Dashboard Center Popup Modal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label>Audience Filter Group</Label>
                        <Select value={annTarget} onValueChange={(v: any) => setAnnTarget(v)}>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="all">Broadcast to All Users</SelectItem>
                            <SelectItem value="clients">Clients Only</SelectItem>
                            <SelectItem value="freelancers">Freelancers Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <Label>Announcement Headline Title</Label>
                        <Input value={annTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnnTitle(e.target.value)} placeholder="Important system maintenance next Sunday" className="rounded-xl" />
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <Label>Content Body Details</Label>
                        <Textarea value={annContent} onChange={(e) => setAnnContent(e.target.value)} placeholder="Type announcement contents here..." className="rounded-xl min-h-[80px]" />
                      </div>
                    </div>

                    <Button
                      onClick={() => createAnnMutation.mutate({
                        type: annType,
                        title: annTitle,
                        content: annContent,
                        targetGroup: annTarget,
                        expiryDate: annExpiry || undefined
                      })}
                      className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs h-9 px-4"
                    >
                      Publish Announcement
                    </Button>
                  </Card>

                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6">
                    <h3 className="text-sm font-bold text-slate-800 mb-4">Published Alerts</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-black">
                            <th className="py-3">Banner Placement</th>
                            <th className="py-3">Audience</th>
                            <th className="py-3">Headline Title</th>
                            <th className="py-3">Status</th>
                            <th className="py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-xs">
                          {announcements.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-400">No announcement banners published.</td>
                            </tr>
                          ) : (
                            announcements.map((a: any) => (
                              <tr key={a.id}>
                                <td className="py-3 capitalize text-slate-700 font-semibold">{a.type.replace(/_/g, " ")}</td>
                                <td className="py-3 capitalize text-slate-600">{a.targetGroup}</td>
                                <td className="py-3 text-slate-800 font-medium">{a.title}</td>
                                <td className="py-3">
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 rounded-full text-[9px] font-bold">Active</Badge>
                                </td>
                                <td className="py-3 text-right">
                                  <Button
                                    onClick={() => deleteAnnMutation.mutate(a.id)}
                                    variant="ghost"
                                    className="h-7 text-red-500 hover:text-red-700 p-0"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </motion.div>
              )}

              {activeTab === "notes_roles" && (
                <motion.div
                  key="notes_roles"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <div className="flex gap-2 border-b border-slate-200">
                    <button
                      onClick={() => setNotesRolesSubTab("notes")}
                      className={`pb-2 px-4 text-xs font-bold transition-colors ${
                        notesRolesSubTab === "notes" ? "border-b-2 border-slate-900 text-slate-800" : "text-slate-400"
                      }`}
                    >
                      Admin Notes Center
                    </button>
                    <button
                      onClick={() => setNotesRolesSubTab("roles")}
                      className={`pb-2 px-4 text-xs font-bold transition-colors ${
                        notesRolesSubTab === "roles" ? "border-b-2 border-slate-900 text-slate-800" : "text-slate-400"
                      }`}
                    >
                      Role Permissions (RBAC)
                    </button>
                  </div>

                  {notesRolesSubTab === "notes" ? (
                    <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6">
                      <h3 className="text-sm font-bold text-slate-800">Add Internal Administrator Log Note</h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <Label>Entity Type</Label>
                          <Select value={noteType} onValueChange={setNoteType}>
                            <SelectTrigger className="rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              <SelectItem value="user">User Account</SelectItem>
                              <SelectItem value="project">Project Contract</SelectItem>
                              <SelectItem value="escrow">Escrow Balance</SelectItem>
                              <SelectItem value="dispute">Dispute Ticket</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <Label>Target Entity ID</Label>
                          <Input value={noteEntityId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNoteEntityId(e.target.value)} placeholder="Entity primary ID number" className="rounded-xl" />
                        </div>
                        <div className="md:col-span-3 space-y-1">
                          <Label>Note Content Details (Internal Only)</Label>
                          <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Type notes visible only to platform admins..." className="rounded-xl min-h-[80px]" />
                        </div>
                      </div>
                      <Button
                        onClick={() => addNoteMutation.mutate({
                          entityType: noteType,
                          entityId: Number(noteEntityId),
                          noteText
                        })}
                        className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs h-9 px-4"
                      >
                        Save Note
                      </Button>
                    </Card>
                  ) : (
                    <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6">
                      <h3 className="text-sm font-bold text-slate-800">Custom Admin Roles Matrix</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-black">
                              <th className="py-3">Admin Role</th>
                              <th className="py-3">Fraud Center</th>
                              <th className="py-3">Commission Engine</th>
                              <th className="py-3">Referrals & Rewards</th>
                              <th className="py-3">Smart Escrow Control</th>
                              <th className="py-3">AI Moderation</th>
                              <th className="py-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-600">
                            {customRoles.map((role: any) => (
                              <tr key={role.id}>
                                <td className="py-3 text-slate-850 font-bold">{role.roleName}</td>
                                <td className="py-3 capitalize">{role.permissions?.fraud || "read"}</td>
                                <td className="py-3 capitalize">{role.permissions?.commission || "read"}</td>
                                <td className="py-3 capitalize">{role.permissions?.referrals || "read"}</td>
                                <td className="py-3 capitalize">{role.permissions?.escrow || "read"}</td>
                                <td className="py-3 capitalize">{role.permissions?.moderation || "read"}</td>
                                <td className="py-3 text-right">
                                  <Button
                                    onClick={() => updateRoleMutation.mutate({
                                      roleName: role.roleName,
                                      permissions: { ...role.permissions, escrow: role.permissions.escrow === "write" ? "read" : "write" }
                                    })}
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-[10px] rounded-xl font-bold"
                                  >
                                    Modify Matrix
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}
                </motion.div>
              )}

              {activeTab === "logs_backups" && (
                <motion.div
                  key="logs_backups"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <div className="flex gap-2 border-b border-slate-200">
                    <button
                      onClick={() => setLogsBackupsSubTab("webhooks")}
                      className={`pb-2 px-4 text-xs font-bold transition-colors ${
                        logsBackupsSubTab === "webhooks" ? "border-b-2 border-slate-900 text-slate-800" : "text-slate-400"
                      }`}
                    >
                      Webhooks Center
                    </button>
                    <button
                      onClick={() => setLogsBackupsSubTab("backups")}
                      className={`pb-2 px-4 text-xs font-bold transition-colors ${
                        logsBackupsSubTab === "backups" ? "border-b-2 border-slate-900 text-slate-800" : "text-slate-400"
                      }`}
                    >
                      Database Backup Manager
                    </button>
                    <button
                      onClick={() => setLogsBackupsSubTab("health")}
                      className={`pb-2 px-4 text-xs font-bold transition-colors ${
                        logsBackupsSubTab === "health" ? "border-b-2 border-slate-900 text-slate-800" : "text-slate-400"
                      }`}
                    >
                      System Health Diagnostics
                    </button>
                  </div>

                  {logsBackupsSubTab === "webhooks" ? (
                    <Card className="border-0 shadow-sm rounded-2xl bg-white p-6">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-black">
                              <th className="py-3">Provider</th>
                              <th className="py-3">Webhook Event</th>
                              <th className="py-3">Payload Delivery Details</th>
                              <th className="py-3">Status</th>
                              <th className="py-3">Time Sent</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 text-xs">
                            {webhookLogs.map((log: any) => (
                              <tr key={log.id}>
                                <td className="py-3 font-bold text-slate-700 capitalize">{log.provider}</td>
                                <td className="py-3 font-mono text-[10px] text-slate-800">{log.eventType}</td>
                                <td className="py-3 max-w-[200px] truncate font-mono text-[10px] text-slate-500">{JSON.stringify(log.payload)}</td>
                                <td className="py-3">
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 rounded-full text-[9px] font-bold">delivered</Badge>
                                </td>
                                <td className="py-3 text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  ) : logsBackupsSubTab === "backups" ? (
                    <div className="space-y-6">
                      <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-sm font-bold text-slate-800">Database Snapshot Backup</h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">Run manual dump commands to write schemas to backups folder.</p>
                          </div>
                          <Button
                            onClick={() => runBackupMutation.mutate({ type: "db" })}
                            disabled={runBackupMutation.isPending}
                            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs h-9 px-4 font-semibold"
                          >
                            Trigger Backup Now
                          </Button>
                        </div>
                      </Card>

                      <Card className="border-0 shadow-sm rounded-2xl bg-white p-6">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-black">
                                <th className="py-3">Backup File</th>
                                <th className="py-3">Size</th>
                                <th className="py-3">Type</th>
                                <th className="py-3">Status</th>
                                <th className="py-3">Date</th>
                                <th className="py-3 text-right">Download</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-xs">
                              {backups.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="py-8 text-center text-slate-400">No backup records.</td>
                                </tr>
                              ) : (
                                backups.map((b: any) => (
                                  <tr key={b.id}>
                                    <td className="py-3 font-semibold text-slate-700">{b.filename}</td>
                                    <td className="py-3 text-slate-500">{(Number(b.sizeBytes) / 1024 / 1024).toFixed(2)} MB</td>
                                    <td className="py-3 uppercase text-slate-500">{b.type}</td>
                                    <td className="py-3">
                                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 rounded-full text-[9px] font-bold">{b.status}</Badge>
                                    </td>
                                    <td className="py-3 text-slate-400">{new Date(b.createdAt).toLocaleDateString()}</td>
                                    <td className="py-3 text-right">
                                      <a href={b.downloadUrl} download className="text-slate-600 hover:text-slate-900 inline-block font-bold">
                                        <Download className="h-4 w-4" />
                                      </a>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    </div>
                  ) : (
                    <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <h3 className="text-sm font-bold text-slate-800">Connection Latency Diagnostics</h3>
                        <Button variant="outline" size="sm" onClick={() => refetchHealth()} className="rounded-xl h-8 text-xs font-bold gap-1">
                          <RefreshCw className="h-3 w-3" /> Recheck
                        </Button>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        {healthChecks.map((ch: any, idx: number) => (
                          <div key={idx} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 flex justify-between items-center">
                            <div>
                              <h4 className="text-xs font-bold text-slate-700 uppercase">{ch.componentName}</h4>
                              <p className="text-[11px] text-slate-400 mt-1">{ch.details}</p>
                            </div>
                            <div className="text-right">
                              <span className="font-semibold text-slate-700 text-sm">{ch.responseTimeMs} ms</span>
                              <div className="flex items-center gap-1.5 justify-end mt-1.5">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                <span className="text-[10px] text-green-700 font-bold uppercase">{ch.status}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </motion.div>
              )}

              {activeTab === "flags_audit" && (
                <motion.div
                  key="flags_audit"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <div className="flex gap-2 border-b border-slate-200">
                    <button
                      onClick={() => setFlagsAuditSubTab("flags")}
                      className={`pb-2 px-4 text-xs font-bold transition-colors ${
                        flagsAuditSubTab === "flags" ? "border-b-2 border-slate-900 text-slate-800" : "text-slate-400"
                      }`}
                    >
                      Module Feature Flags
                    </button>
                    <button
                      onClick={() => setFlagsAuditSubTab("audit")}
                      className={`pb-2 px-4 text-xs font-bold transition-colors ${
                        flagsAuditSubTab === "audit" ? "border-b-2 border-slate-900 text-slate-800" : "text-slate-400"
                      }`}
                    >
                      Audit Trail logs
                    </button>
                  </div>

                  {flagsAuditSubTab === "flags" ? (
                    <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6">
                      <div className="space-y-4">
                        {featureFlags.map((flag: any) => (
                          <div key={flag.id} className="flex justify-between items-center border-b border-slate-50 pb-4">
                            <div>
                              <Label className="text-sm font-bold text-slate-700">{flag.flagName} ({flag.flagKey})</Label>
                              <p className="text-[11px] text-slate-400">{flag.description}</p>
                            </div>
                            <Switch
                              checked={flag.isEnabled}
                              onCheckedChange={(checked) => toggleFlagMutation.mutate({ id: flag.id, isEnabled: checked })}
                            />
                          </div>
                        ))}
                      </div>
                    </Card>
                  ) : (
                    <Card className="border-0 shadow-sm rounded-2xl bg-white p-6">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-black">
                              <th className="py-3">Admin</th>
                              <th className="py-3">Action</th>
                              <th className="py-3">Target Details</th>
                              <th className="py-3">Note Reason</th>
                              <th className="py-3">Old / New Values</th>
                              <th className="py-3 text-right">Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 text-xs">
                            {auditLogs.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-slate-400">No administrative logs recorded in this session.</td>
                              </tr>
                            ) : (
                              auditLogs.map((log: any) => (
                                <tr key={log.id}>
                                  <td className="py-3">
                                    <div className="font-bold text-slate-800">{log.adminName}</div>
                                    <div className="text-[10px] text-slate-400">{log.adminEmail}</div>
                                  </td>
                                  <td className="py-3 font-semibold text-slate-800 capitalize">{log.action}</td>
                                  <td className="py-3 font-medium text-slate-600">
                                    <span className="capitalize">{log.targetType.replace(/_/g, " ")}</span>
                                    <span className="text-[10px] text-slate-400 block">ID #{log.targetId}</span>
                                  </td>
                                  <td className="py-3 text-slate-500 max-w-[150px] truncate">{log.reason || "N/A"}</td>
                                  <td className="py-3 font-mono text-[9px] max-w-[200px] truncate text-slate-400">
                                    {log.newValue ? JSON.stringify(log.newValue) : "N/A"}
                                  </td>
                                  <td className="py-3 text-slate-400 text-right">{new Date(log.createdAt).toLocaleTimeString()}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}
