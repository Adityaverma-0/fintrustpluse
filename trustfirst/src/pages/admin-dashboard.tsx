import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  DollarSign, 
  Briefcase, 
  Shield, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Ban, 
  Search, 
  RefreshCw, 
  Sliders, 
  Ticket, 
  Download, 
  Settings, 
  Check
} from "lucide-react";

export default function AdminDashboard() {
  const { toast } = useToast();
  const qc = useQueryClient();

  // Modals state
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isEscrowTransactionsOpen, setIsEscrowTransactionsOpen] = useState(false);
  const [isDisputeResolutionOpen, setIsDisputeResolutionOpen] = useState(false);
  const [isPlatformSettingsOpen, setIsPlatformSettingsOpen] = useState(false);

  // User search/filter
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<any | null>(null);

  // Selected details queries
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

  const { data: healthLogs } = useQuery<any[]>({
    queryKey: ["admin-health-logs"],
    queryFn: () => api.get<any[]>("/admin-enterprise/system-health").catch(() => []),
  });

  const { data: commConfig } = useQuery<any>({
    queryKey: ["admin-commissions"],
    queryFn: () => api.get<any>("/admin-enterprise/commissions"),
  });

  const { data: coupons = [] } = useQuery<any[]>({
    queryKey: ["admin-coupons"],
    queryFn: () => api.get<any[]>("/admin-enterprise/coupons"),
  });

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

  // Dispute resolution
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

  // Settings mutations
  const updateCommissionsMutation = useMutation({
    mutationFn: (body: any) => api.post("/admin-enterprise/commissions", body),
    onSuccess: () => {
      toast({ title: "Platform commission configuration updated successfully" });
      qc.invalidateQueries({ queryKey: ["admin-commissions"] });
    }
  });

  const createCouponMutation = useMutation({
    mutationFn: (body: any) => api.post("/admin-enterprise/coupons/create", body),
    onSuccess: () => {
      toast({ title: "Coupon voucher created successfully" });
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
    }
  });

  const deleteCouponMutation = useMutation({
    mutationFn: (couponId: number) => api.delete(`/admin-enterprise/coupons/${couponId}`),
    onSuccess: () => {
      toast({ title: "Coupon voucher deleted" });
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
    }
  });

  // Escrow mutations
  const escrowActionMutation = useMutation({
    mutationFn: (body: any) => api.post("/admin-enterprise/escrow/action", body),
    onSuccess: () => {
      toast({ title: "Escrow modification processed successfully" });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    }
  });

  // Settings State Form
  const [platformCommissionRate, setPlatformCommissionRate] = useState("10");
  const [referralBonus, setReferralBonus] = useState("25");
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponDiscount, setNewCouponDiscount] = useState("15");

  useEffect(() => {
    if (commConfig) {
      setPlatformCommissionRate(String(commConfig.platformCommissionRate || "10"));
      setReferralBonus(String(commConfig.referralBonus || "25"));
    }
  }, [commConfig]);

  // Derived variables
  const platformStats = [
    { 
      label: "Total Users", 
      value: stats?.users ? (stats.users.total).toLocaleString() : "850,421", 
      change: stats?.users ? `F: ${stats.users.freelancers} / C: ${stats.users.clients}` : "+1,234 this week", 
      icon: Users, 
      color: "text-blue-600", 
      bg: "bg-blue-50" 
    },
    { 
      label: "Total Escrow Volume", 
      value: stats?.escrow ? `$${(stats.escrow.totalLocked).toLocaleString()}` : "$2.4B", 
      change: stats?.escrow ? "Active secure reserves" : "+$4.2M today", 
      icon: Shield, 
      color: "text-primary", 
      bg: "bg-primary/5" 
    },
    { 
      label: "Active Contracts", 
      value: stats?.projects ? (stats.projects.active).toLocaleString() : "12,847", 
      change: stats?.projects ? `Total: ${stats.projects.total}` : "+89 today", 
      icon: Briefcase, 
      color: "text-green-600", 
      bg: "bg-green-50" 
    },
    { 
      label: "Platform Revenue", 
      value: stats?.escrow ? `$${(stats.escrow.totalEarned).toLocaleString()}` : "$240M", 
      change: stats?.escrow ? "Accumulated commissions" : "+$420K this month", 
      icon: DollarSign, 
      color: "text-yellow-600", 
      bg: "bg-yellow-50" 
    },
    { 
      label: "Dispute Rate", 
      value: stats?.projects?.total > 0 ? `${((stats.disputes.total / stats.projects.total) * 100).toFixed(2)}%` : "0.3%", 
      change: stats?.projects ? `${stats.disputes.total} cases total` : "-0.1% vs last month", 
      icon: AlertTriangle, 
      color: "text-orange-600", 
      bg: "bg-orange-50" 
    },
    { 
      label: "Escrow Success", 
      value: "99.7%", 
      change: "Industry leading", 
      icon: TrendingUp, 
      color: "text-teal-600", 
      bg: "bg-teal-50" 
    },
  ];

  const recentUsers = users.length > 0 ? users.slice(0, 4).map(u => ({
    id: u.id,
    name: u.name,
    role: u.role,
    email: u.email,
    status: u.emailVerified ? "verified" : "active",
    joined: new Date(u.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    earned: u.role === "freelancer" ? `$${Number(u.totalEarned || 0).toLocaleString()}` : undefined,
    spent: u.role === "client" ? `$${Number(u.totalSpent || 0).toLocaleString()}` : undefined,
    initials: u.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase(),
    bg: u.role === "freelancer" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700",
    isSuspended: u.isSuspended,
  })) : [
    { name: "James Wilson", role: "freelancer", email: "james@dev.pro", status: "verified", joined: "May 15", earned: "$124K", initials: "JW", bg: "bg-blue-100 text-blue-700" },
    { name: "Sarah Chen", role: "client", email: "sarah@techcorp.com", status: "verified", joined: "Apr 2", spent: "$48K", initials: "SC", bg: "bg-purple-100 text-purple-700" },
    { name: "David Kim", role: "freelancer", email: "david@ai.dev", status: "verified", joined: "Mar 10", earned: "$215K", initials: "DK", bg: "bg-green-100 text-green-700" },
    { name: "Marcus Johnson", role: "client", email: "marcus@startup.io", status: "active", joined: "Jun 1", spent: "$12K", initials: "MJ", bg: "bg-orange-100 text-orange-700" },
  ];

  const flaggedItems = disputes.filter(d => d.status !== "resolved").map(d => ({
    id: d.id,
    type: "dispute",
    description: `Dispute Case #${d.id} raised on project "${d.project?.title || 'Contract'}"`,
    severity: d.status === "initiated" ? "high" : "medium",
    time: new Date(d.createdAt).toLocaleDateString(),
    status: d.status,
  })).concat(
    disputes.length === 0 ? [
      { id: 1, type: "dispute", description: "Contract #891: Payment dispute - client claims deliverable not met", severity: "high", time: "2 hours ago", status: "initiated" },
      { id: 2, type: "account", description: "Suspicious activity on account priya@design.io - multiple login attempts", severity: "medium", time: "5 hours ago", status: "initiated" },
      { id: 3, type: "fraud", description: "Potential fraudulent job posting ID #234 - keywords match spam patterns", severity: "low", time: "1 day ago", status: "initiated" },
    ] : []
  );

  const systemHealth = [
    { label: "API Uptime", value: "99.99%", ok: true },
    { label: "DB Response", value: healthLogs?.[0]?.dbLatency ? `${healthLogs[0].dbLatency}ms` : "12ms", ok: true },
    { label: "Escrow Engine", value: "Online", ok: true },
    { label: "AI Matching", value: "Online", ok: true },
    { label: "Fraud Detection", value: "Online", ok: true },
  ];

  return (
    <div className="min-h-screen bg-secondary/20">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-muted-foreground text-sm">TrustFirst+ Platform Control Center</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries()} className="rounded-full">
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Sync Live DB
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {platformStats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card>
                <CardContent className="p-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.bg}`}>
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <div className="text-xl font-bold">{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                  <div className="text-xs text-primary mt-1">{s.change}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Flagged Items */}
            <Card className="border-orange-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Flagged Items Requiring Attention
                  <Badge className="bg-orange-100 text-orange-700 ml-auto">{flaggedItems.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {flaggedItems.map((item: any, i) => (
                  <div key={i} className={`p-3 rounded-lg border flex items-start gap-3 ${
                    item.severity === "high" ? "bg-red-50 border-red-100" : item.severity === "medium" ? "bg-orange-50 border-orange-100" : "bg-yellow-50 border-yellow-100"
                  }`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      item.severity === "high" ? "bg-red-500" : item.severity === "medium" ? "bg-orange-500" : "bg-yellow-500"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-xs capitalize ${
                          item.severity === "high" ? "border-red-200 text-red-700" : item.severity === "medium" ? "border-orange-200 text-orange-700" : "border-yellow-200 text-yellow-700"
                        }`}>{item.severity}</Badge>
                        <span className="text-xs text-muted-foreground">{item.time}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="sm" variant="outline" className="h-7 text-xs rounded-full" onClick={() => setIsDisputeResolutionOpen(true)}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Resolve
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Users */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" /> Recent User Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentUsers.map((u: any) => (
                    <div key={u.email} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-all">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={`font-bold ${u.bg}`}>{u.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{u.name}</p>
                          <Badge variant="outline" className={`text-xs capitalize ${u.role === "freelancer" ? "border-blue-200 text-blue-600" : "border-purple-200 text-purple-600"}`}>
                            {u.role}
                          </Badge>
                          {u.isSuspended && <Badge className="bg-red-100 text-red-700 text-[10px]">Suspended</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{u.email} · Joined {u.joined}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {u.earned && <p className="text-sm font-semibold text-green-600">{u.earned} earned</p>}
                        {u.spent && <p className="text-sm font-semibold text-blue-600">{u.spent} spent</p>}
                        <Badge className={`text-xs mt-0.5 ${u.status === "verified" ? "bg-green-100 text-green-700" : "bg-secondary text-muted-foreground"}`}>
                          {u.status === "verified" ? "✓ Verified" : "Active"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Category Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Volume by Category
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Development & IT", percent: 42, amount: "$1.01B" },
                  { label: "Design & Creative", percent: 21, amount: "$504M" },
                  { label: "Finance & Accounting", percent: 15, amount: "$360M" },
                  { label: "Writing & Translation", percent: 11, amount: "$264M" },
                  { label: "Marketing & Sales", percent: 8, amount: "$192M" },
                  { label: "Other", percent: 3, amount: "$72M" },
                ].map(c => (
                  <div key={c.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground truncate">{c.label}</span>
                      <span className="font-medium ml-2">{c.percent}%</span>
                    </div>
                    <Progress value={c.percent} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* System Health */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" /> System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {systemHealth.map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${s.ok ? "bg-green-500" : "bg-red-500"}`} />
                      <span className="text-xs font-medium">{s.value}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <Button variant="outline" className="w-full rounded-full justify-start h-9 text-sm" onClick={() => setIsUserManagementOpen(true)}>
                  <Users className="h-4 w-4 mr-2" /> User Management
                </Button>
                <Button variant="outline" className="w-full rounded-full justify-start h-9 text-sm" onClick={() => setIsEscrowTransactionsOpen(true)}>
                  <DollarSign className="h-4 w-4 mr-2" /> Escrow Transactions
                </Button>
                <Button variant="outline" className="w-full rounded-full justify-start h-9 text-sm" onClick={() => setIsDisputeResolutionOpen(true)}>
                  <AlertTriangle className="h-4 w-4 mr-2" /> Dispute Resolution
                </Button>
                <Button variant="outline" className="w-full rounded-full justify-start h-9 text-sm" onClick={() => setIsPlatformSettingsOpen(true)}>
                  <Shield className="h-4 w-4 mr-2" /> Platform Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 1. USER MANAGEMENT DIALOG */}
      {/* ========================================== */}
      <Dialog open={isUserManagementOpen} onOpenChange={setIsUserManagementOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Control Management</DialogTitle>
            <DialogDescription>Search, view wallet history, active contracts, and suspend, delete, or reset passwords on live users.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, email or role..." 
                value={userSearch} 
                onChange={(e) => setUserSearch(e.target.value)} 
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              const csvData = users.map(u => `${u.id},${u.name},${u.email},${u.role},${u.isSuspended}`).join("\n");
              const blob = new Blob([`ID,Name,Email,Role,Suspended\n${csvData}`], { type: "text/csv" });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.setAttribute("href", url);
              a.setAttribute("download", "fintrust_users.csv");
              a.click();
            }}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {/* List */}
            <div className="md:col-span-2 border rounded-xl overflow-hidden h-[350px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Details</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users
                    .filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()) || u.role.toLowerCase().includes(userSearch.toLowerCase()))
                    .map(u => (
                      <TableRow key={u.id} className={selectedUserForDetails?.id === u.id ? "bg-accent/40" : ""}>
                        <TableCell>
                          <div className="font-medium text-xs">{u.name}</div>
                          <div className="text-[10px] text-muted-foreground">{u.email}</div>
                          {u.isSuspended && <Badge variant="destructive" className="text-[9px] px-1 py-0.5">Suspended</Badge>}
                        </TableCell>
                        <TableCell className="capitalize text-xs font-semibold">{u.role}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="text-[10px] px-2 h-7" onClick={() => setSelectedUserForDetails(u)}>
                              Inspect
                            </Button>
                            {u.isSuspended ? (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-[10px] text-green-600 hover:bg-green-50 h-7" 
                                onClick={() => userActionMutation.mutate({ userId: u.id, action: "reactivate" })}
                              >
                                Enable
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-[10px] text-red-600 hover:bg-red-50 h-7"
                                onClick={() => userActionMutation.mutate({ userId: u.id, action: "suspend" })}
                              >
                                Suspend
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>

            {/* Details Panel */}
            <div className="border rounded-xl p-4 bg-muted/20 h-[350px] overflow-y-auto">
              {selectedUserForDetails ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-xs">{selectedUserForDetails.name}</h3>
                    <p className="text-[11px] text-muted-foreground">{selectedUserForDetails.email}</p>
                    <p className="text-[10px] text-muted-foreground">ID: {selectedUserForDetails.id}</p>
                  </div>

                  <div className="space-y-2 pt-2 border-t text-xs">
                    <div className="font-semibold flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 text-emerald-600" /> Wallet Balance</div>
                    <div className="flex justify-between"><span>Available:</span><span className="font-semibold text-emerald-700">${Number(userWallet?.availableBalance || 0).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Escrow Locked:</span><span className="font-semibold text-primary">${Number(userWallet?.escrowBalance || 0).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Total Earned:</span><span className="font-semibold">${Number(userWallet?.totalEarned || 0).toLocaleString()}</span></div>
                  </div>

                  <div className="space-y-2 pt-2 border-t text-xs">
                    <div className="font-semibold flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-blue-600" /> Contracts ({userContracts.length})</div>
                    <div className="max-h-[80px] overflow-y-auto space-y-1">
                      {userContracts.map((c: any) => (
                        <div key={c.id} className="text-[10px] bg-secondary/50 p-1 rounded flex justify-between">
                          <span className="truncate max-w-[120px]">{c.title}</span>
                          <span className="font-semibold capitalize">{c.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t flex flex-col gap-1.5">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => userActionMutation.mutate({ userId: selectedUserForDetails.id, action: "reset-password" })}
                      className="w-full text-xs"
                    >
                      Reset Password
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this user?")) {
                          userActionMutation.mutate({ userId: selectedUserForDetails.id, action: "delete" });
                          setSelectedUserForDetails(null);
                        }
                      }}
                      className="w-full text-xs"
                    >
                      Delete Account
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground text-center">Select inspect on a user to view detailed statistics, wallet logs, and manage controls.</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================== */}
      {/* 2. ESCROW TRANSACTIONS DIALOG */}
      {/* ========================================== */}
      <Dialog open={isEscrowTransactionsOpen} onOpenChange={setIsEscrowTransactionsOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Escrow Overrides & Balances</DialogTitle>
            <DialogDescription>Direct override control over active platform escrows. Instantly release, partial release, or refund balances.</DialogDescription>
          </DialogHeader>

          <div className="border rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project ID</TableHead>
                  <TableHead>Client & Freelancer</TableHead>
                  <TableHead>Secure Funds</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userEscrows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">
                      Please inspect a Client or Freelancer in User Management first to read their linked escrow contracts.
                    </TableCell>
                  </TableRow>
                ) : (
                  userEscrows.map((esc: any) => {
                    const remaining = Number(esc.totalAmount) - Number(esc.releasedAmount) - Number(esc.refundedAmount);
                    return (
                      <TableRow key={esc.id}>
                        <TableCell className="font-bold">#{esc.projectId}</TableCell>
                        <TableCell>
                          <div className="text-xs">Client ID: {esc.clientId}</div>
                          <div className="text-xs text-muted-foreground">Freelancer ID: {esc.freelancerId}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">Total: ${Number(esc.totalAmount).toLocaleString()}</div>
                          <div className="text-xs text-emerald-600 font-semibold">Remaining: ${remaining.toLocaleString()}</div>
                        </TableCell>
                        <TableCell className="capitalize text-xs font-semibold">{esc.status}</TableCell>
                        <TableCell>
                          <div className="flex gap-1.5">
                            <Button 
                              size="sm" 
                              className="text-[10px] px-2 h-7"
                              onClick={() => escrowActionMutation.mutate({ escrowId: esc.id, action: "release", amount: String(remaining) })}
                            >
                              Release
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-[10px] text-orange-600 hover:bg-orange-50 h-7"
                              onClick={() => {
                                const partial = prompt(`Enter partial release amount (Max: $${remaining}):`);
                                if (partial && !isNaN(Number(partial))) {
                                  escrowActionMutation.mutate({ escrowId: esc.id, action: "partial_release", amount: partial });
                                }
                              }}
                            >
                              Partial
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-[10px] text-red-600 hover:bg-red-50 h-7"
                              onClick={() => escrowActionMutation.mutate({ escrowId: esc.id, action: "refund", amount: String(remaining) })}
                            >
                              Refund
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================== */}
      {/* 3. DISPUTE RESOLUTION DIALOG */}
      {/* ========================================== */}
      <Dialog open={isDisputeResolutionOpen} onOpenChange={setIsDisputeResolutionOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dispute Case Arbitrator</DialogTitle>
            <DialogDescription>Review active disputes, assign cases to yourself, and perform administrative mediation splits/releases.</DialogDescription>
          </DialogHeader>

          <div className="border rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case ID</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Resolution Status</TableHead>
                  <TableHead>Arbitration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-8">No disputes raised on the platform.</TableCell>
                  </TableRow>
                ) : (
                  disputes.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-bold">#{d.id}</TableCell>
                      <TableCell>
                        <div className="font-medium text-xs">Project ID: #{d.projectId}</div>
                        <div className="text-[11px] text-slate-600">{d.reason || "Disputed milestone deliverables"}</div>
                        {d.resolution && <div className="text-[10px] text-emerald-700 bg-emerald-50 p-1.5 rounded-lg mt-1">Resolution: {d.resolution}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-[10px]">{d.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {d.status !== "resolved" ? (
                          <div className="flex flex-col gap-1">
                            {d.status === "initiated" && (
                              <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => assignDisputeMutation.mutate(d.id)}>
                                Assign to Me
                              </Button>
                            )}
                            <div className="flex gap-1.5">
                              <Button 
                                size="sm" 
                                className="h-7 text-[10px]" 
                                onClick={() => resolveDisputeMutation.mutate({ disputeId: d.id, action: "release" })}
                              >
                                Release
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-7 text-[10px] text-red-600 hover:bg-red-50"
                                onClick={() => resolveDisputeMutation.mutate({ disputeId: d.id, action: "refund" })}
                              >
                                Refund
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-7 text-[10px] text-orange-600 hover:bg-orange-50"
                                onClick={() => {
                                  const fShare = prompt("Enter Freelancer share amount:");
                                  const cShare = prompt("Enter Client share amount:");
                                  if (fShare && cShare) {
                                    resolveDisputeMutation.mutate({ 
                                      disputeId: d.id, 
                                      action: "split", 
                                      freelancerShare: Number(fShare), 
                                      clientShare: Number(cShare) 
                                    });
                                  }
                                }}
                              >
                                Split
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground flex items-center"><Check className="h-4 w-4 text-green-600 mr-1" /> Resolved</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================== */}
      {/* 4. PLATFORM SETTINGS DIALOG */}
      {/* ========================================== */}
      <Dialog open={isPlatformSettingsOpen} onOpenChange={setIsPlatformSettingsOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>FinTrust+ Platform Settings</DialogTitle>
            <DialogDescription>Modify platform commission fee parameters and coupon voucher codes.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Commissions Form */}
            <div className="space-y-4 border rounded-xl p-4 bg-muted/10">
              <h3 className="font-semibold text-sm flex items-center gap-1.5"><Sliders className="h-4 w-4 text-emerald-600" /> Commissions & Fees</h3>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground block">Platform Commission Rate (%)</label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    value={platformCommissionRate} 
                    onChange={(e) => setPlatformCommissionRate(e.target.value)} 
                    className="h-8"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => updateCommissionsMutation.mutate({
                      platformCommissionRate,
                      clientFee: "0",
                      freelancerFee: "0",
                      gstRate: "18",
                      taxesRate: "0",
                      withdrawalCharges: "0",
                      internationalCharges: "0",
                      referralBonus,
                    })}
                  >
                    Save Rate
                  </Button>
                </div>
              </div>
            </div>

            {/* Coupons manager */}
            <div className="space-y-4 border rounded-xl p-4 bg-muted/10">
              <h3 className="font-semibold text-sm flex items-center gap-1.5"><Ticket className="h-4 w-4 text-blue-600" /> Vouchers & Coupons</h3>
              
              <div className="flex gap-2">
                <Input 
                  placeholder="CODE (e.g. SAVE15)" 
                  value={newCouponCode} 
                  onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                  className="h-8 text-xs"
                />
                <Input 
                  placeholder="Discount %" 
                  type="number" 
                  value={newCouponDiscount} 
                  onChange={(e) => setNewCouponDiscount(e.target.value)}
                  className="h-8 text-xs w-24"
                />
                <Button size="sm" className="h-8" onClick={() => {
                  createCouponMutation.mutate({
                    code: newCouponCode,
                    type: "percentage",
                    value: newCouponDiscount,
                    minProjectValue: "100",
                    usageLimit: "500",
                    expiryDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
                  });
                  setNewCouponCode("");
                }}>
                  Create
                </Button>
              </div>

              <div className="max-h-[150px] overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Code</TableHead>
                      <TableHead className="text-xs">Discount</TableHead>
                      <TableHead className="text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coupons.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-bold text-xs">{c.code}</TableCell>
                        <TableCell className="text-xs">{c.value}%</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 text-[10px] h-6 px-1.5" onClick={() => deleteCouponMutation.mutate(c.id)}>
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
