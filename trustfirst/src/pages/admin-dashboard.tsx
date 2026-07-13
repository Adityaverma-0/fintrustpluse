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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Sliders,
  Ticket,
  Check,
} from "lucide-react";

type TabType =
  | "overview"
  | "users"
  | "fraud"
  | "commissions"
  | "referrals"
  | "coupons"
  | "featured_jobs"
  | "escrow"
  | "ai"
  | "announcements"
  | "notes"
  | "roles"
  | "webhooks"
  | "backups"
  | "health"
  | "flags_audit";

export default function AdminDashboard() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Sub-tabs for combined sections
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
  const [noteQueryType, setNoteQueryType] = useState("user");
  const [noteQueryId, setNoteQueryId] = useState("1");

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

  // User details inspector modal state
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<any | null>(null);

  // Real-Time Websocket Connection for live sync
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/realtime?userId=9999`;
    
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    
    function connect() {
      ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (
            payload.type === "dashboard_update" ||
            payload.type === "commission_update" ||
            payload.type === "feature_flag_update" ||
            payload.type === "announcement_update"
          ) {
            qc.invalidateQueries();
            toast({
              title: "Live Update",
              description: `Real-time sync triggered: ${payload.type.replace(/_/g, " ")}`,
            });
          }
        } catch (err) {}
      };
      
      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 3000);
      };
      
      ws.onerror = () => {
        ws?.close();
      };
    }
    
    connect();
    
    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [qc]);

  // Main admin queries
  const { data: stats } = useQuery<any>({
    queryKey: ["admin-stats"],
    queryFn: () => api.get<any>("/admin/stats"),
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["admin-users"],
    queryFn: () => api.get<any[]>("/admin/users"),
  });

  const { data: disputes = [] } = useQuery<any[]>({
    queryKey: ["admin-disputes"],
    queryFn: () => api.get<any[]>("/admin/disputes"),
  });

  const { data: analyticsData } = useQuery<any>({
    queryKey: ["admin-analytics"],
    queryFn: () => api.get<any>("/admin-enterprise/analytics")
  });

  const { data: withdrawals = [], isLoading: isWithdrawalsLoading } = useQuery<any[]>({
    queryKey: ["admin-withdrawals"],
    queryFn: () => api.get<any[]>("/admin/withdrawals").catch(() => []),
  });

  const { data: fraudLogs = [] } = useQuery<any[]>({
    queryKey: ["admin-fraud-logs"],
    queryFn: () => api.get<any[]>("/admin-enterprise/fraud-logs")
  });

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

  const { data: referrals = [] } = useQuery<any[]>({
    queryKey: ["admin-referrals"],
    queryFn: () => api.get<any[]>("/admin-enterprise/referrals")
  });

  const { data: coupons = [] } = useQuery<any[]>({
    queryKey: ["admin-coupons"],
    queryFn: () => api.get<any[]>("/admin-enterprise/coupons")
  });

  const { data: featuredJobs = [] } = useQuery<any[]>({
    queryKey: ["admin-featured-jobs"],
    queryFn: () => api.get<any[]>("/admin-enterprise/featured-jobs")
  });

  const { data: escrowAccounts = [] } = useQuery<any[]>({
    queryKey: ["admin-escrow-list"],
    queryFn: () => api.get<any[]>("/admin-enterprise/escrow/list")
  });

  const { data: escrowControlLogs = [] } = useQuery<any[]>({
    queryKey: ["admin-escrow-logs"],
    queryFn: () => api.get<any[]>("/admin-enterprise/escrow/logs")
  });

  const { data: aiModerationLogs = [] } = useQuery<any[]>({
    queryKey: ["admin-ai-logs"],
    queryFn: () => api.get<any[]>("/admin-enterprise/ai-moderation/list")
  });

  const { data: announcements = [] } = useQuery<any[]>({
    queryKey: ["admin-announcements"],
    queryFn: () => api.get<any[]>("/admin-enterprise/announcements")
  });

  const { data: customRoles = [] } = useQuery<any[]>({
    queryKey: ["admin-roles"],
    queryFn: () => api.get<any[]>("/admin-enterprise/roles")
  });

  const { data: webhookLogs = [] } = useQuery<any[]>({
    queryKey: ["admin-webhooks"],
    queryFn: () => api.get<any[]>("/admin-enterprise/webhooks")
  });

  const { data: backups = [] } = useQuery<any[]>({
    queryKey: ["admin-backups"],
    queryFn: () => api.get<any[]>("/admin-enterprise/backups")
  });

  const { data: featureFlags = [] } = useQuery<any[]>({
    queryKey: ["admin-feature-flags"],
    queryFn: () => api.get<any[]>("/admin-enterprise/feature-flags")
  });

  const { data: auditLogs = [] } = useQuery<any[]>({
    queryKey: ["admin-audit-logs"],
    queryFn: () => api.get<any[]>("/admin-enterprise/audit-logs")
  });

  const { data: healthChecks = [], refetch: refetchHealth } = useQuery<any[]>({
    queryKey: ["admin-system-health"],
    queryFn: () => api.get<any[]>("/admin-enterprise/system-health").catch(() => [])
  });

  // Notes Query for specific entity inspection
  const { data: entityNotes = [] } = useQuery<any[]>({
    queryKey: ["admin-entity-notes", noteQueryType, noteQueryId],
    queryFn: () => api.get<any[]>(`/admin-enterprise/notes/${noteQueryType}/${noteQueryId}`),
    enabled: !!noteQueryId,
  });

  // Selected User Sub-Queries for Inspect Modal
  const { data: userWallet } = useQuery<any>({
    queryKey: ["admin-user-wallet", selectedUserForDetails?.id],
    queryFn: () => api.get<any>(`/admin/users/${selectedUserForDetails.id}/wallet`),
    enabled: !!selectedUserForDetails,
  });

  const { data: userEscrows = [] } = useQuery<any[]>({
    queryKey: ["admin-user-escrows", selectedUserForDetails?.id],
    queryFn: () => api.get<any[]>(`/admin/users/${selectedUserForDetails.id}/escrows`),
    enabled: !!selectedUserForDetails,
  });

  const { data: userContracts = [] } = useQuery<any[]>({
    queryKey: ["admin-user-contracts", selectedUserForDetails?.id],
    queryFn: () => api.get<any[]>(`/admin/users/${selectedUserForDetails.id}/contracts`),
    enabled: !!selectedUserForDetails,
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
  const userActionMutation = useMutation({
    mutationFn: ({ userId, action }: { userId: number; action: "suspend" | "ban" | "reactivate" | "delete" | "reset-password" }) => {
      if (action === "delete") {
        return api.delete(`/admin/users/${userId}`);
      }
      return api.post(`/admin/users/${userId}/${action}`, {});
    },
    onSuccess: (data: any, vars) => {
      toast({ 
        title: "Action Successful", 
        description: vars.action === "reset-password" 
          ? `Password successfully reset to: ${data.newPassword}` 
          : `User account status updated: ${vars.action}` 
      });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (err: any) => {
      toast({ title: "Action Failed", description: err.message, variant: "destructive" });
    }
  });

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
      qc.invalidateQueries({ queryKey: ["admin-entity-notes"] });
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

  const resolveDisputeMutation = useMutation({
    mutationFn: ({ disputeId, action, freelancerShare, clientShare }: { disputeId: number; action: string; freelancerShare?: number; clientShare?: number }) =>
      api.post(`/admin/disputes/${disputeId}/resolve`, { action, freelancerShare, clientShare }),
    onSuccess: () => {
      toast({ title: "Dispute resolved successfully" });
      qc.invalidateQueries({ queryKey: ["admin-disputes"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    }
  });

  const assignDisputeMutation = useMutation({
    mutationFn: (disputeId: number) => api.post(`/admin/disputes/${disputeId}/assign`, {}),
    onSuccess: () => {
      toast({ title: "Dispute assigned to you successfully" });
      qc.invalidateQueries({ queryKey: ["admin-disputes"] });
    }
  });

  // Calculate platform metrics
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

  // Render Left Navigation Button Helper
  const renderNavButton = (tab: TabType, label: string, Icon: React.ComponentType<any>) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-3 px-4 py-2.5 text-left text-xs font-bold border-l-4 transition-all duration-150 ${
        activeTab === tab
          ? "border-primary bg-primary/5 text-primary"
          : "border-transparent text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-secondary/10 text-foreground font-sans">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Top Header Card */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 dark:bg-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/10">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">FinTrust+ Enterprise Control Center</h1>
              <p className="text-xs text-muted-foreground font-medium">Production Node • PostgreSQL Synchronized</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries()} className="rounded-full gap-1 h-8 text-xs font-bold">
              <RefreshCw className="h-3 w-3" /> Sync Live DB
            </Button>
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 rounded-full font-bold px-3 py-1 text-xs">
              Live Connected
            </Badge>
          </div>
        </div>

        {/* Outer Split Layout */}
        <div className="grid lg:grid-cols-4 gap-8">
          
          {/* Navigation left sidebar */}
          <div className="space-y-4">
            <Card className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden py-3 dark:bg-card">
              <div className="px-4 py-1.5 text-[10px] font-black text-muted-foreground/60 uppercase tracking-wider">Metrics & Controls</div>
              <nav className="flex flex-col">
                {renderNavButton("overview", "Live Overview", Activity)}
                {renderNavButton("users", "User Control", Users)}
                {renderNavButton("fraud", "Fraud Detection", AlertTriangle)}
                {renderNavButton("escrow", "Escrow Center", Lock)}
                {renderNavButton("ai", "AI Moderation", Shield)}
              </nav>

              <div className="px-4 py-1.5 mt-4 text-[10px] font-black text-muted-foreground/60 uppercase tracking-wider font-bold">Config & Systems</div>
              <nav className="flex flex-col">
                {renderNavButton("commissions", "Commissions", Percent)}
                {renderNavButton("referrals", "Referral Network", Sliders)}
                {renderNavButton("coupons", "Coupons Vouchers", Ticket)}
                {renderNavButton("featured_jobs", "Visibility Pinned", TrendingUp)}
                {renderNavButton("announcements", "Announcements", Megaphone)}
                {renderNavButton("notes", "Notes Center", Code)}
                {renderNavButton("roles", "RBAC Perm Matrix", Key)}
              </nav>

              <div className="px-4 py-1.5 mt-4 text-[10px] font-black text-muted-foreground/60 uppercase tracking-wider font-bold">Backups & Logs</div>
              <nav className="flex flex-col">
                {renderNavButton("webhooks", "Webhook logs", Terminal)}
                {renderNavButton("backups", "DB Backups", Database)}
                {renderNavButton("health", "Latency Diagnostics", Server)}
                {renderNavButton("flags_audit", "Flags & Audits", Globe)}
              </nav>
            </Card>

            {/* Quick Status Bar */}
            <Card className="border-0 shadow-sm bg-white rounded-2xl p-4 space-y-3 dark:bg-card">
              <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Live System Status</h4>
              <div className="space-y-2 text-xs font-semibold text-muted-foreground">
                <div className="flex justify-between items-center">
                  <span>API Server Gateway</span>
                  <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-0 py-0 px-2 text-[10px]">Online</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Pub/Sub WS Core</span>
                  <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-0 py-0 px-2 text-[10px]">Connected</Badge>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Main Panel */}
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
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-0 shadow-sm rounded-2xl bg-white p-4 dark:bg-card">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-blue-50">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="text-2xl font-bold tracking-tight">{analyticsData?.summary?.users?.total ?? 0}</div>
                      <div className="text-[9px] text-muted-foreground font-black uppercase mt-1">Platform Users</div>
                    </Card>

                    <Card className="border-0 shadow-sm rounded-2xl bg-white p-4 dark:bg-card">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-emerald-50">
                        <Shield className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-bold tracking-tight">${Number(analyticsData?.summary?.escrowLocked ?? 0).toLocaleString()}</div>
                      <div className="text-[9px] text-muted-foreground font-black uppercase mt-1">Escrow Locked</div>
                    </Card>

                    <Card className="border-0 shadow-sm rounded-2xl bg-white p-4 dark:bg-card">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-indigo-50">
                        <DollarSign className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div className="text-2xl font-bold tracking-tight">${Number(analyticsData?.summary?.transactionVolume ?? 0).toLocaleString()}</div>
                      <div className="text-[9px] text-muted-foreground font-black uppercase mt-1">Total Payouts</div>
                    </Card>

                    <Card className="border-0 shadow-sm rounded-2xl bg-white p-4 dark:bg-card">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-purple-50">
                        <Briefcase className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="text-2xl font-bold tracking-tight">{analyticsData?.summary?.projects?.active ?? 0}</div>
                      <div className="text-[9px] text-muted-foreground font-black uppercase mt-1">Active Projects</div>
                    </Card>
                  </div>

                  {/* Financial Charts */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="border-0 shadow-sm rounded-2xl bg-white p-5 space-y-4 dark:bg-card">
                      <h4 className="text-sm font-bold">Financial Volumes (USD)</h4>
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

                    <Card className="border-0 shadow-sm rounded-2xl bg-white p-5 space-y-4 dark:bg-card">
                      <h4 className="text-sm font-bold">User Growth History</h4>
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
                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6 dark:bg-card">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-base font-bold">Freelancer Withdrawal Requests</CardTitle>
                        <CardDescription className="text-xs mt-1 text-muted-foreground">Review pending Razorpay payout transfers.</CardDescription>
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
                            <SelectItem value="all">All Status</SelectItem>
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
                          <tr className="border-b border-secondary text-[10px] text-muted-foreground uppercase font-black">
                            <th className="py-3">Recipient / Account</th>
                            <th className="py-3">Amount</th>
                            <th className="py-3">Method</th>
                            <th className="py-3">Status</th>
                            <th className="py-3">Date</th>
                            <th className="py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary text-xs">
                          {filteredWithdrawals.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-muted-foreground">No withdrawal requests found.</td>
                            </tr>
                          ) : (
                            filteredWithdrawals.map((w: any) => (
                              <tr key={w.id}>
                                <td className="py-3">
                                  <div className="font-bold text-foreground">{w.bankAccount?.holderName || "Unknown"}</div>
                                  <div className="text-[10px] text-muted-foreground">A/C: {w.bankAccount?.accountNumber} ({w.bankAccount?.ifsc})</div>
                                </td>
                                <td className="py-3 font-semibold text-foreground">${w.amount}</td>
                                <td className="py-3 capitalize text-muted-foreground">{w.payoutMethod || "Bank Transfer"}</td>
                                <td className="py-3">
                                  <Badge className={`border-0 rounded-full text-[9px] font-bold ${
                                    w.status === "successful" ? "bg-green-100 text-green-700" :
                                    w.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                                  }`}>
                                    {w.status}
                                  </Badge>
                                </td>
                                <td className="py-3 text-muted-foreground">{new Date(w.createdAt).toLocaleDateString()}</td>
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
                                          placeholder="Reason..."
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

              {activeTab === "users" && (
                <motion.div
                  key="users"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                >
                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6 dark:bg-card">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-base font-bold">User Management Control</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">Manage user system states, reset credentials, and view account logs.</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => {
                        const csvData = users.map(u => `${u.id},${u.name},${u.email},${u.role},${u.isSuspended}`).join("\n");
                        const blob = new Blob([`ID,Name,Email,Role,Suspended\n${csvData}`], { type: "text/csv" });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.setAttribute("href", url);
                        a.setAttribute("download", "fintrust_users_list.csv");
                        a.click();
                      }} className="rounded-xl h-8 text-xs font-bold gap-1.5">
                        <Download className="h-3.5 w-3.5" /> Export CSV
                      </Button>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users by name, email or role..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 rounded-xl"
                      />
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-secondary text-[10px] text-muted-foreground uppercase font-black">
                            <th className="py-3">User</th>
                            <th className="py-3">Role</th>
                            <th className="py-3">Status</th>
                            <th className="py-3">Joined Date</th>
                            <th className="py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary text-xs">
                          {users
                            .filter(u => u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map((u: any) => (
                              <tr key={u.id}>
                                <td className="py-3 font-semibold text-foreground">
                                  <div>{u.name}</div>
                                  <div className="text-[10px] text-muted-foreground font-normal">{u.email}</div>
                                </td>
                                <td className="py-3 capitalize text-muted-foreground font-semibold">{u.role}</td>
                                <td className="py-3">
                                  {u.isSuspended ? (
                                    <Badge variant="destructive" className="rounded-full text-[9px] font-bold px-2 py-0.5">Suspended</Badge>
                                  ) : (
                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 rounded-full text-[9px] font-bold px-2 py-0.5">Active</Badge>
                                  )}
                                </td>
                                <td className="py-3 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                                <td className="py-3 text-right space-x-1.5">
                                  <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-xl font-bold" onClick={() => setSelectedUserForDetails(u)}>
                                    Inspect
                                  </Button>
                                  {u.isSuspended ? (
                                    <Button size="sm" variant="outline" className="h-7 text-[10px] text-green-600 rounded-xl font-bold" onClick={() => userActionMutation.mutate({ userId: u.id, action: "reactivate" })}>
                                      Reactivate
                                    </Button>
                                  ) : (
                                    <Button size="sm" variant="outline" className="h-7 text-[10px] text-red-600 rounded-xl font-bold" onClick={() => userActionMutation.mutate({ userId: u.id, action: "suspend" })}>
                                      Suspend
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
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
                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6 dark:bg-card">
                    <div>
                      <CardTitle className="text-base font-bold">Fraud & Risk Detection Center</CardTitle>
                      <CardDescription className="text-xs mt-1 text-muted-foreground">Automated risk scores, device fingerprints, and location anomalies.</CardDescription>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-secondary text-[10px] text-muted-foreground uppercase font-black">
                            <th className="py-3">Risk Trigger</th>
                            <th className="py-3">Target Details</th>
                            <th className="py-3">Severity</th>
                            <th className="py-3">IP Address / Device Fingerprint</th>
                            <th className="py-3">Status</th>
                            <th className="py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary text-xs">
                          {fraudLogs.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-muted-foreground">No fraud indicators detected in this cycle.</td>
                            </tr>
                          ) : (
                            fraudLogs.map((log: any) => (
                              <tr key={log.id}>
                                <td className="py-3">
                                  <div className="font-bold text-foreground capitalize">{log.type?.replace(/_/g, " ")}</div>
                                </td>
                                <td className="py-3">
                                  <span className="font-semibold text-muted-foreground text-[11px]">ID #{log.targetId}</span>
                                  <p className="text-[10px] text-muted-foreground max-w-[200px] truncate">{log.details}</p>
                                </td>
                                <td className="py-3">
                                  <Badge className={`border-0 rounded-full text-[9px] font-bold ${
                                    log.severity === "high" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                                  }`}>
                                    {log.severity}
                                  </Badge>
                                </td>
                                <td className="py-3 font-mono text-[10px] text-muted-foreground">
                                  <div>{log.ipAddress || "0.0.0.0"}</div>
                                  <div className="text-[9px] text-muted-foreground/60">{log.fingerprint || "no-device-hash"}</div>
                                </td>
                                <td className="py-3 capitalize font-bold text-foreground">
                                  <Badge variant="outline">{log.status}</Badge>
                                </td>
                                <td className="py-3 text-right space-x-1.5">
                                  <Button
                                    onClick={() => fraudActionMutation.mutate({ logId: log.id, action: "ban", reason: "Automated risk mitigation" })}
                                    size="sm"
                                    className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-7 px-2.5 text-[9px] font-bold"
                                  >
                                    Ban
                                  </Button>
                                  <Button
                                    onClick={() => fraudActionMutation.mutate({ logId: log.id, action: "freeze_wallet", reason: "Wallet locked due to risk logs" })}
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

              {activeTab === "escrow" && (
                <motion.div
                  key="escrow"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6 dark:bg-card">
                    <div>
                      <CardTitle className="text-base font-bold">Escrow Override Control Center</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground font-medium">Verify live contracts, release milestones, or refund client balances directly.</CardDescription>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-secondary text-[10px] text-muted-foreground uppercase font-black">
                            <th className="py-3">Project Title</th>
                            <th className="py-3">Client</th>
                            <th className="py-3">Freelancer</th>
                            <th className="py-3">Balances (Locked / Released)</th>
                            <th className="py-3">Status</th>
                            <th className="py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary text-xs">
                          {escrowAccounts.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-muted-foreground">No active escrow ledger accounts.</td>
                            </tr>
                          ) : (
                            escrowAccounts.map((e: any) => {
                              const remaining = Number(e.totalAmount) - Number(e.releasedAmount) - Number(e.refundedAmount);
                              return (
                                <tr key={e.id}>
                                  <td className="py-3 font-bold text-foreground">{e.projectTitle}</td>
                                  <td className="py-3 text-muted-foreground">{e.clientName}</td>
                                  <td className="py-3 text-muted-foreground">{e.freelancerName}</td>
                                  <td className="py-3 font-medium">
                                    <div className="text-emerald-600">Remaining: ${remaining.toLocaleString()}</div>
                                    <div className="text-[10px] text-muted-foreground">Budget: ${e.totalAmount} (Released: ${e.releasedAmount})</div>
                                  </td>
                                  <td className="py-3">
                                    <Badge className={`border-0 rounded-full text-[9px] font-bold ${
                                      e.status === "funded" ? "bg-green-100 text-green-700" :
                                      e.status === "frozen" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
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

                  {/* Override audit history */}
                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 dark:bg-card">
                    <h3 className="text-sm font-bold mb-4">Escrow Action Audit Log Trail</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-secondary text-[10px] text-muted-foreground uppercase font-black">
                            <th className="py-3">Escrow ID</th>
                            <th className="py-3">Action</th>
                            <th className="py-3">Amount</th>
                            <th className="py-3">Reason Note</th>
                            <th className="py-3">Admin</th>
                            <th className="py-3">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary text-xs">
                          {escrowControlLogs.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-muted-foreground">No override logs captured.</td>
                            </tr>
                          ) : (
                            escrowControlLogs.map((log: any) => (
                              <tr key={log.id}>
                                <td className="py-3 font-bold">#{log.escrowId}</td>
                                <td className="py-3 capitalize font-semibold">{log.action?.replace(/_/g, " ")}</td>
                                <td className="py-3 font-semibold">${log.amount}</td>
                                <td className="py-3 text-muted-foreground max-w-[200px] truncate">{log.reason}</td>
                                <td className="py-3 text-muted-foreground font-bold">Admin ID #{log.adminId}</td>
                                <td className="py-3 text-muted-foreground">{new Date(log.createdAt).toLocaleDateString()}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </motion.div>
              )}

              {activeTab === "ai" && (
                <motion.div
                  key="ai"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                >
                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6 dark:bg-card">
                    <div>
                      <CardTitle className="text-base font-bold">AI Content Moderation Center</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-0.5">Filter duplicate bids, abusive reviews, fake listings and keywords flags.</CardDescription>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-secondary text-[10px] text-muted-foreground uppercase font-black">
                            <th className="py-3">Flagged Entity</th>
                            <th className="py-3">Content Body</th>
                            <th className="py-3">AI Flags</th>
                            <th className="py-3">Flagged Words</th>
                            <th className="py-3">Status</th>
                            <th className="py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary text-xs">
                          {aiModerationLogs.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-muted-foreground">No content flag alerts. AI scan status is clear.</td>
                            </tr>
                          ) : (
                            aiModerationLogs.map((log: any) => (
                              <tr key={log.id}>
                                <td className="py-3 font-bold capitalize">
                                  <div>{log.entityType}</div>
                                  <div className="text-[10px] text-muted-foreground font-normal">ID #{log.entityId}</div>
                                </td>
                                <td className="py-3 max-w-[200px] truncate text-muted-foreground">{log.textContent}</td>
                                <td className="py-3">
                                  <div className="font-bold text-red-600">Spam: {Math.round(Number(log.spamScore || 0) * 100)}%</div>
                                  <div className="text-[10px] text-muted-foreground">Confidence: {Math.round(Number(log.confidence || 0) * 100)}%</div>
                                </td>
                                <td className="py-3 font-mono text-orange-600 text-[10px]">{log.flaggedWords || "None"}</td>
                                <td className="py-3 capitalize">
                                  <Badge className={`border-0 rounded-full text-[9px] font-bold ${
                                    log.status === "approved" ? "bg-green-100 text-green-700" :
                                    log.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                                  }`}>
                                    {log.status}
                                  </Badge>
                                </td>
                                <td className="py-3 text-right space-x-1.5">
                                  {log.status === "flagged" && (
                                    <>
                                      <Button
                                        onClick={() => moderationActionMutation.mutate({ id: log.id, action: "approve" })}
                                        size="sm"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-7 px-2.5 text-[10px] font-bold"
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

              {activeTab === "commissions" && (
                <motion.div
                  key="commissions"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6 dark:bg-card">
                    <div>
                      <CardTitle className="text-base font-bold">Commission Engine Config</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-0.5">Configure platform margins, GST rate brackets, and payout taxes.</CardDescription>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <Label className="text-xs">Platform Commission (%)</Label>
                        <Input value={platformCommissionRate} onChange={(e) => setPlatformCommissionRate(e.target.value)} className="rounded-xl h-9 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Client Fee (%)</Label>
                        <Input value={clientFee} onChange={(e) => setClientFee(e.target.value)} className="rounded-xl h-9 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Freelancer Fee (%)</Label>
                        <Input value={freelancerFee} onChange={(e) => setFreelancerFee(e.target.value)} className="rounded-xl h-9 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">GST Commission Rate (%)</Label>
                        <Input value={gstRate} onChange={(e) => setGstRate(e.target.value)} className="rounded-xl h-9 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Taxes bracket / TDS (%)</Label>
                        <Input value={taxesRate} onChange={(e) => setTaxesRate(e.target.value)} className="rounded-xl h-9 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Withdrawal Charges ($ USD)</Label>
                        <Input value={withdrawalCharges} onChange={(e) => setWithdrawalCharges(e.target.value)} className="rounded-xl h-9 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">International Surcharge ($ USD)</Label>
                        <Input value={internationalCharges} onChange={(e) => setInternationalCharges(e.target.value)} className="rounded-xl h-9 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Referral Bonus ($ USD)</Label>
                        <Input value={referralBonus} onChange={(e) => setReferralBonus(e.target.value)} className="rounded-xl h-9 text-xs" />
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

                  {/* dynamic calculator preview */}
                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-4 dark:bg-card">
                    <h4 className="text-xs font-black uppercase text-muted-foreground">Dynamic Calculator Preview</h4>
                    <div className="flex gap-4 items-end">
                      <div className="space-y-1 max-w-[200px]">
                        <Label className="text-xs">Test Project Budget ($)</Label>
                        <Input type="number" value={calcBudget} onChange={(e) => setCalcBudget(e.target.value)} className="rounded-xl h-9 text-xs" />
                      </div>
                    </div>

                    {calcResult && (
                      <div className="grid md:grid-cols-2 gap-4 bg-secondary/20 p-4 rounded-xl border border-secondary text-xs font-semibold text-muted-foreground">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Platform Cut ({platformCommissionRate}%)</span>
                            <span className="text-foreground">${calcResult.platCommission.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Client Fee ({clientFee}%)</span>
                            <span className="text-foreground">${calcResult.cFee.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Freelancer Fee ({freelancerFee}%)</span>
                            <span className="text-foreground">${calcResult.fFee.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="space-y-2 border-t md:border-t-0 md:border-l border-secondary pt-2 md:pt-0 md:pl-4">
                          <div className="flex justify-between">
                            <span>GST on Commissions ({gstRate}%)</span>
                            <span className="text-foreground">${calcResult.gst.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-emerald-600 font-bold">
                            <span>Net Freelancer Payout</span>
                            <span>${calcResult.netFreelancerPayout.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-primary font-bold">
                            <span>Total Client Cost</span>
                            <span>${calcResult.totalClientCost.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>
              )}

              {activeTab === "referrals" && (
                <motion.div
                  key="referrals"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                >
                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6 dark:bg-card">
                    <h3 className="text-base font-bold">Referral Networks & Bonus History</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-secondary text-[10px] text-muted-foreground uppercase font-black">
                            <th className="py-3">Referrer User</th>
                            <th className="py-3">Referee User</th>
                            <th className="py-3">Reward Balance</th>
                            <th className="py-3">Status</th>
                            <th className="py-3">Date</th>
                            <th className="py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary text-xs">
                          {referrals.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-muted-foreground">No referral logs found.</td>
                            </tr>
                          ) : (
                            referrals.map((r: any) => (
                              <tr key={r.id}>
                                <td className="py-3 font-bold">{r.referrerName} ({r.referrerEmail})</td>
                                <td className="py-3 text-muted-foreground">{r.refereeName} ({r.refereeEmail})</td>
                                <td className="py-3 font-semibold text-emerald-600">${r.rewardAmount}</td>
                                <td className="py-3 capitalize">
                                  <Badge className={`border-0 rounded-full text-[9px] font-bold ${
                                    r.status === "completed" ? "bg-green-100 text-green-700" :
                                    r.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                                  }`}>
                                    {r.status}
                                  </Badge>
                                </td>
                                <td className="py-3 text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
                                <td className="py-3 text-right">
                                  {r.status === "pending" && (
                                    <div className="flex justify-end gap-1.5">
                                      <Button
                                        onClick={() => referralActionMutation.mutate({ referralId: r.id, action: "approve" })}
                                        size="sm"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-7 px-2.5 text-[10px] font-bold"
                                      >
                                        Approve
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
                </motion.div>
              )}

              {activeTab === "coupons" && (
                <motion.div
                  key="coupons"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6 dark:bg-card">
                    <h3 className="text-base font-bold">Coupon Code Generator</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Coupon Code</Label>
                        <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="SUMMER20" className="rounded-xl h-9 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Discount Type</Label>
                        <Select value={couponType} onValueChange={(v: any) => setCouponType(v)}>
                          <SelectTrigger className="rounded-xl h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="percent">Percentage (%)</SelectItem>
                            <SelectItem value="fixed">Fixed Flat ($ USD)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Value amount</Label>
                        <Input value={couponValue} onChange={(e) => setCouponValue(e.target.value)} placeholder="15" className="rounded-xl h-9 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Expiry Date</Label>
                        <Input type="date" value={couponExpiry} onChange={(e) => setCouponExpiry(e.target.value)} className="rounded-xl h-9 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Usage Limit count</Label>
                        <Input type="number" value={couponLimit} onChange={(e) => setCouponLimit(Number(e.target.value))} className="rounded-xl h-9 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Category Restriction</Label>
                        <Input value={couponCategory} onChange={(e) => setCouponCategory(e.target.value)} placeholder="Development / Design" className="rounded-xl h-9 text-xs" />
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

                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 dark:bg-card">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-secondary text-[10px] text-muted-foreground uppercase font-black">
                            <th className="py-3">Voucher Code</th>
                            <th className="py-3">Value</th>
                            <th className="py-3">Usage</th>
                            <th className="py-3">Expires</th>
                            <th className="py-3">Status</th>
                            <th className="py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary text-xs">
                          {coupons.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-muted-foreground">No active coupons.</td>
                            </tr>
                          ) : (
                            coupons.map((c: any) => (
                              <tr key={c.id}>
                                <td className="py-3 font-bold text-foreground">{c.code}</td>
                                <td className="py-3 font-semibold">
                                  {c.discountType === "percent" ? `${c.discountValue}%` : `$${c.discountValue}`}
                                </td>
                                <td className="py-3 text-muted-foreground">{c.usageCount} / {c.usageLimit}</td>
                                <td className="py-3 text-muted-foreground">{new Date(c.expiryDate).toLocaleDateString()}</td>
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
                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6 dark:bg-card">
                    <h3 className="text-base font-bold">Feature Job Visibility Promotion</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Target Job ID</Label>
                        <Input value={featJobId} onChange={(e) => setFeatJobId(e.target.value)} placeholder="Job ID number" className="rounded-xl h-9 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Expiry Date</Label>
                        <Input type="date" value={featExpiry} onChange={(e) => setFeatExpiry(e.target.value)} className="rounded-xl h-9 text-xs" />
                      </div>

                      <div className="md:col-span-2 flex flex-wrap gap-6 items-center py-2 bg-secondary/20 p-4 rounded-xl">
                        <div className="flex items-center gap-2">
                          <Switch checked={featPinned} onCheckedChange={setFeatPinned} />
                          <Label className="text-xs font-semibold">Pin to Top</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={featTrending} onCheckedChange={setFeatTrending} />
                          <Label className="text-xs font-semibold">Mark Trending</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={featUrgent} onCheckedChange={setFeatUrgent} />
                          <Label className="text-xs font-semibold">Mark Urgent</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={featSponsored} onCheckedChange={setFeatSponsored} />
                          <Label className="text-xs font-semibold">Sponsored Tag</Label>
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
                      Promote Job Listing
                    </Button>
                  </Card>

                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 dark:bg-card">
                    <h3 className="text-sm font-bold mb-4">Actively Boosted Promoted Listings</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-secondary text-[10px] text-muted-foreground uppercase font-black">
                            <th className="py-3">Job ID</th>
                            <th className="py-3">Job Title</th>
                            <th className="py-3">Active Badges</th>
                            <th className="py-3">Promotion Expiry</th>
                            <th className="py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary text-xs">
                          {featuredJobs.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-muted-foreground">No promoted listings active.</td>
                            </tr>
                          ) : (
                            featuredJobs.map((f: any) => (
                              <tr key={f.id}>
                                <td className="py-3 font-bold">#{f.jobId}</td>
                                <td className="py-3 font-semibold text-foreground">{f.jobTitle}</td>
                                <td className="py-3">
                                  <div className="flex flex-wrap gap-1">
                                    {f.isPinned && <Badge variant="outline" className="text-[9px] border-slate-200">Pinned</Badge>}
                                    {f.isTrending && <Badge variant="outline" className="text-[9px] border-slate-200">Trending</Badge>}
                                    {f.isUrgent && <Badge variant="outline" className="text-[9px] border-slate-200">Urgent</Badge>}
                                    {f.isSponsored && <Badge variant="outline" className="text-[9px] border-slate-200">Sponsored</Badge>}
                                  </div>
                                </td>
                                <td className="py-3 text-muted-foreground">{new Date(f.expiryDate).toLocaleDateString()}</td>
                                <td className="py-3 text-right">
                                  <Button
                                    onClick={() => deleteFeaturedJobMutation.mutate(f.id)}
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-[10px] text-red-650 rounded-xl"
                                  >
                                    Stop Promos
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

              {activeTab === "announcements" && (
                <motion.div
                  key="announcements"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6 dark:bg-card">
                    <h3 className="text-base font-bold">Broadcast Placement & Announcements</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Banner Placement Placement</Label>
                        <Select value={annType} onValueChange={(v: any) => setAnnType(v)}>
                          <SelectTrigger className="rounded-xl h-9 text-xs">
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
                        <Label className="text-xs">Target Audience Group</Label>
                        <Select value={annTarget} onValueChange={(v: any) => setAnnTarget(v)}>
                          <SelectTrigger className="rounded-xl h-9 text-xs">
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
                        <Label className="text-xs">Headline Title</Label>
                        <Input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} placeholder="System upgrades planned this weekend" className="rounded-xl h-9 text-xs" />
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-xs">Content Body Details</Label>
                        <Textarea value={annContent} onChange={(e) => setAnnContent(e.target.value)} placeholder="Explain details..." className="rounded-xl min-h-[60px]" />
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
                      Publish Alert
                    </Button>
                  </Card>

                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 dark:bg-card">
                    <h3 className="text-sm font-bold mb-4">Published Active Banners</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-secondary text-[10px] text-muted-foreground uppercase font-black">
                            <th className="py-3">Type</th>
                            <th className="py-3">Audience</th>
                            <th className="py-3">Headline Title</th>
                            <th className="py-3">Status</th>
                            <th className="py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary text-xs">
                          {announcements.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-muted-foreground">No active banners.</td>
                            </tr>
                          ) : (
                            announcements.map((a: any) => (
                              <tr key={a.id}>
                                <td className="py-3 capitalize text-foreground font-semibold">{a.type?.replace(/_/g, " ")}</td>
                                <td className="py-3 capitalize text-muted-foreground">{a.targetGroup}</td>
                                <td className="py-3 text-foreground font-medium">{a.title}</td>
                                <td className="py-3">
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 rounded-full text-[9px] font-bold px-2 py-0.5">Active</Badge>
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

              {activeTab === "notes" && (
                <motion.div
                  key="notes"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6 dark:bg-card">
                    <h3 className="text-base font-bold">Write Internal Admin Note</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Target Entity Type</Label>
                        <Select value={noteType} onValueChange={(v: any) => setNoteType(v)}>
                          <SelectTrigger className="rounded-xl h-9 text-xs">
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
                        <Label className="text-xs">Entity Target ID</Label>
                        <Input value={noteEntityId} onChange={(e) => setNoteEntityId(e.target.value)} placeholder="Target record numerical ID..." className="rounded-xl h-9 text-xs" />
                      </div>
                      <div className="md:col-span-3 space-y-1">
                        <Label className="text-xs">Notes content body</Label>
                        <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Type notes visible only to administrators..." className="rounded-xl min-h-[60px] text-xs" />
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

                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 dark:bg-card">
                    <div className="flex gap-4 items-end mb-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Inspect Type</Label>
                        <Select value={noteQueryType} onValueChange={(v: any) => setNoteQueryType(v)}>
                          <SelectTrigger className="rounded-xl h-9 text-xs w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="project">Project</SelectItem>
                            <SelectItem value="escrow">Escrow</SelectItem>
                            <SelectItem value="dispute">Dispute</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Inspect ID</Label>
                        <Input value={noteQueryId} onChange={(e) => setNoteQueryId(e.target.value)} className="rounded-xl h-9 text-xs w-[100px]" />
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-secondary text-[10px] text-muted-foreground uppercase font-black">
                            <th className="py-3">Log Date</th>
                            <th className="py-3">Author Admin</th>
                            <th className="py-3">Note Log description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary text-xs">
                          {entityNotes.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="py-8 text-center text-muted-foreground">No notes logged for this target ID.</td>
                            </tr>
                          ) : (
                            entityNotes.map((log: any) => (
                              <tr key={log.id}>
                                <td className="py-3 text-muted-foreground">{new Date(log.createdAt).toLocaleDateString()}</td>
                                <td className="py-3 font-semibold">{log.adminName}</td>
                                <td className="py-3 text-foreground font-medium">{log.noteText}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </motion.div>
              )}

              {activeTab === "roles" && (
                <motion.div
                  key="roles"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                >
                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6 dark:bg-card">
                    <h3 className="text-base font-bold">Admin Permissions Matrix (RBAC)</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-secondary text-[10px] text-muted-foreground uppercase font-black">
                            <th className="py-3">Admin Role</th>
                            <th className="py-3">Fraud Center</th>
                            <th className="py-3">Commissions</th>
                            <th className="py-3">Referrals</th>
                            <th className="py-3">Escrow</th>
                            <th className="py-3">AI Moderation</th>
                            <th className="py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary text-xs font-semibold text-muted-foreground">
                          {customRoles.map((role: any) => (
                            <tr key={role.id}>
                              <td className="py-3 font-bold text-foreground">{role.roleName}</td>
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
                                  Toggle Escrow Write
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </motion.div>
              )}

              {activeTab === "webhooks" && (
                <motion.div
                  key="webhooks"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                >
                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 dark:bg-card">
                    <h3 className="text-base font-bold mb-4">Platform Webhook Ingress Center</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-secondary text-[10px] text-muted-foreground uppercase font-black">
                            <th className="py-3">Provider</th>
                            <th className="py-3">Webhook Event</th>
                            <th className="py-3">Payload Details</th>
                            <th className="py-3">Response</th>
                            <th className="py-3 text-right">Time Sent</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary text-xs">
                          {webhookLogs.map((log: any) => (
                            <tr key={log.id}>
                              <td className="py-3 font-bold capitalize">{log.provider}</td>
                              <td className="py-3 font-mono text-[10px] text-red-650">{log.eventType}</td>
                              <td className="py-3 max-w-[200px] truncate font-mono text-[10px] text-muted-foreground">{JSON.stringify(log.payload)}</td>
                              <td className="py-3 font-mono text-[10px] text-muted-foreground">{JSON.stringify(log.response)}</td>
                              <td className="py-3 text-muted-foreground text-right">{new Date(log.timestamp).toLocaleTimeString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </motion.div>
              )}

              {activeTab === "backups" && (
                <motion.div
                  key="backups"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-4 dark:bg-card">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-base font-bold">Database Backup & Snapshots</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Run manual backups to generate SQL dumps on disk.</p>
                      </div>
                      <Button
                        onClick={() => runBackupMutation.mutate({ type: "db" })}
                        disabled={runBackupMutation.isPending}
                        className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs h-9 px-4 font-semibold"
                      >
                        Backup Database
                      </Button>
                    </div>
                  </Card>

                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 dark:bg-card">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-secondary text-[10px] text-muted-foreground uppercase font-black">
                            <th className="py-3">Backup Filename</th>
                            <th className="py-3">Size</th>
                            <th className="py-3">Type</th>
                            <th className="py-3">Status</th>
                            <th className="py-3">Date</th>
                            <th className="py-3 text-right">Download</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary text-xs">
                          {backups.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-muted-foreground">No backup records.</td>
                            </tr>
                          ) : (
                            backups.map((b: any) => (
                              <tr key={b.id}>
                                <td className="py-3 font-semibold text-foreground">{b.filename}</td>
                                <td className="py-3 text-muted-foreground">{(Number(b.sizeBytes) / 1024 / 1024).toFixed(2)} MB</td>
                                <td className="py-3 uppercase text-muted-foreground">{b.type}</td>
                                <td className="py-3">
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 rounded-full text-[9px] font-bold">{b.status}</Badge>
                                </td>
                                <td className="py-3 text-muted-foreground">{new Date(b.createdAt).toLocaleDateString()}</td>
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
                </motion.div>
              )}

              {activeTab === "health" && (
                <motion.div
                  key="health"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                >
                  <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6 dark:bg-card">
                    <div className="flex justify-between items-center border-b border-secondary pb-3">
                      <h3 className="text-sm font-bold">System Latency Diagnostics</h3>
                      <Button variant="outline" size="sm" onClick={() => refetchHealth()} className="rounded-xl h-8 text-xs font-bold gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5" /> Recheck Health
                      </Button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {healthChecks.map((ch: any, idx: number) => (
                        <div key={idx} className="border border-secondary rounded-2xl p-4 bg-secondary/10 flex justify-between items-center">
                          <div>
                            <h4 className="text-xs font-bold uppercase">{ch.componentName}</h4>
                            <p className="text-[11px] text-muted-foreground mt-1">{ch.details}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-sm">{ch.responseTimeMs} ms</span>
                            <div className="flex items-center gap-1.5 justify-end mt-1.5">
                              <div className="w-2 h-2 bg-green-500 rounded-full" />
                              <span className="text-[10px] text-green-700 font-bold uppercase">{ch.status}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
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
                  <div className="flex gap-2 border-b border-secondary">
                    <button
                      onClick={() => setFlagsAuditSubTab("flags")}
                      className={`pb-2 px-4 text-xs font-bold transition-colors ${
                        flagsAuditSubTab === "flags" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      Module Feature Flags
                    </button>
                    <button
                      onClick={() => setFlagsAuditSubTab("audit")}
                      className={`pb-2 px-4 text-xs font-bold transition-colors ${
                        flagsAuditSubTab === "audit" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      Audit Trail logs
                    </button>
                  </div>

                  {flagsAuditSubTab === "flags" ? (
                    <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-6 dark:bg-card">
                      <div className="space-y-4">
                        {featureFlags.map((flag: any) => (
                          <div key={flag.id} className="flex justify-between items-center border-b border-secondary pb-4">
                            <div>
                              <Label className="text-sm font-bold">{flag.flagName} ({flag.flagKey})</Label>
                              <p className="text-[11px] text-muted-foreground">{flag.description}</p>
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
                    <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 dark:bg-card">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-secondary text-[10px] text-muted-foreground uppercase font-black">
                              <th className="py-3">Admin</th>
                              <th className="py-3">Action</th>
                              <th className="py-3">Target</th>
                              <th className="py-3 font-medium">Reason Note</th>
                              <th className="py-3">Values Modification</th>
                              <th className="py-3 text-right">Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-secondary text-xs">
                            {auditLogs.map((log: any) => (
                              <tr key={log.id}>
                                <td className="py-3 font-semibold">
                                  <div>{log.adminName}</div>
                                  <div className="text-[10px] text-muted-foreground font-normal">{log.adminEmail}</div>
                                </td>
                                <td className="py-3 capitalize text-foreground font-bold">{log.action}</td>
                                <td className="py-3 capitalize text-muted-foreground">
                                  <div>{log.targetType?.replace(/_/g, " ")}</div>
                                  <div className="text-[9px] text-muted-foreground/60 font-mono">ID #{log.targetId}</div>
                                </td>
                                <td className="py-3 text-muted-foreground max-w-[150px] truncate">{log.reason}</td>
                                <td className="py-3 max-w-[150px] truncate font-mono text-[10px] text-muted-foreground">
                                  {JSON.stringify(log.newValue)}
                                </td>
                                <td className="py-3 text-muted-foreground text-right">{new Date(log.createdAt).toLocaleTimeString()}</td>
                              </tr>
                            ))}
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

      {/* ========================================== */}
      {/* 1. OVERRIDE SETTINGS DIALOG */}
      {/* ========================================== */}
      <Dialog open={escrowActionModal} onOpenChange={setEscrowActionModal}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 dark:bg-card">
          <DialogHeader>
            <DialogTitle>Admin Override Transaction</DialogTitle>
            <DialogDescription>Modify smart contract escrow state immediately.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs font-semibold text-muted-foreground">
            <div className="space-y-1">
              <Label className="text-xs">Select Action</Label>
              <Select value={escrowActionType} onValueChange={(v: any) => setEscrowActionType(v)}>
                <SelectTrigger className="rounded-xl h-9 text-xs">
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
              <Label className="text-xs">Action Amount ($ USD)</Label>
              <Input value={escrowActionAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEscrowActionAmount(e.target.value)} className="rounded-xl h-9 text-xs" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Reason Log Note</Label>
              <Textarea value={escrowActionReason} onChange={(e) => setEscrowActionReason(e.target.value)} placeholder="State audit reason..." className="rounded-xl min-h-[60px] text-xs" />
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

      {/* ========================================== */}
      {/* 2. USER INSPECTION DETAIL MODAL */}
      {/* ========================================== */}
      <Dialog open={!!selectedUserForDetails} onOpenChange={() => setSelectedUserForDetails(null)}>
        <DialogContent className="max-w-2xl bg-white rounded-3xl p-6 dark:bg-card">
          <DialogHeader>
            <DialogTitle>Administrative Inspection Panel</DialogTitle>
            <DialogDescription>Real-time wallet tracking, active job contracts, and escrow allocations.</DialogDescription>
          </DialogHeader>

          {selectedUserForDetails && (
            <div className="space-y-6 my-2 text-xs font-semibold text-muted-foreground">
              {/* Profile Card */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/20">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {selectedUserForDetails.name?.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-foreground text-sm">{selectedUserForDetails.name}</h3>
                  <p className="text-[11px] font-normal">{selectedUserForDetails.email} (Role: <span className="capitalize">{selectedUserForDetails.role}</span>)</p>
                </div>
              </div>

              {/* Wallet Ledger */}
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-black uppercase text-muted-foreground/80 tracking-wider flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Wallet Ledger Details</h4>
                <div className="grid grid-cols-3 gap-2 bg-secondary/10 p-3 rounded-xl border border-secondary">
                  <div>
                    <span className="text-[10px] font-normal">Available</span>
                    <div className="text-sm font-bold text-emerald-600">${Number(userWallet?.availableBalance || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-normal">Locked Escrows</span>
                    <div className="text-sm font-bold text-primary">${Number(userWallet?.escrowBalance || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-normal">Cumulative Earnings</span>
                    <div className="text-sm font-bold">${Number(userWallet?.totalEarned || 0).toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Active Contracts & Escrows */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase text-muted-foreground/80 tracking-wider flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> Active Contracts ({userContracts.length})</h4>
                  <div className="border border-secondary rounded-xl p-2 max-h-[120px] overflow-y-auto space-y-1">
                    {userContracts.length === 0 ? (
                      <div className="text-center py-4 text-[10px] font-normal text-muted-foreground">No contract history found.</div>
                    ) : (
                      userContracts.map((c: any) => (
                        <div key={c.id} className="p-1.5 bg-secondary/20 rounded flex justify-between text-[10px]">
                          <span className="truncate max-w-[150px]">{c.title}</span>
                          <span className="capitalize text-foreground">{c.status}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase text-muted-foreground/80 tracking-wider flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> Linked Escrows ({userEscrows.length})</h4>
                  <div className="border border-secondary rounded-xl p-2 max-h-[120px] overflow-y-auto space-y-1">
                    {userEscrows.length === 0 ? (
                      <div className="text-center py-4 text-[10px] font-normal text-muted-foreground">No linked escrows.</div>
                    ) : (
                      userEscrows.map((esc: any) => (
                        <div key={esc.id} className="p-1.5 bg-secondary/20 rounded flex justify-between text-[10px]">
                          <span>Project ID: #{esc.projectId}</span>
                          <span className="text-emerald-600 font-bold">${Number(esc.totalAmount).toLocaleString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Inspector action options */}
              <div className="pt-2 border-t flex flex-col sm:flex-row gap-2">
                <Button size="sm" variant="outline" className="flex-1 rounded-xl h-8 text-xs font-bold" onClick={() => userActionMutation.mutate({ userId: selectedUserForDetails.id, action: "reset-password" })}>
                  Reset Password
                </Button>
                <Button size="sm" variant="destructive" className="flex-1 rounded-xl h-8 text-xs font-bold" onClick={() => {
                  if (confirm("Permanently purge this user account?")) {
                    userActionMutation.mutate({ userId: selectedUserForDetails.id, action: "delete" });
                    setSelectedUserForDetails(null);
                  }
                }}>
                  Purge Account
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
