import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Users, DollarSign, Briefcase, Shield, TrendingUp, AlertTriangle, CheckCircle, Clock, Ban } from "lucide-react";

const RECENT_USERS = [
  { name: "James Wilson", role: "freelancer", email: "james@dev.pro", status: "verified", joined: "May 15", earned: "$124K", initials: "JW", bg: "bg-blue-100 text-blue-700" },
  { name: "Sarah Chen", role: "client", email: "sarah@techcorp.com", status: "verified", joined: "Apr 2", spent: "$48K", initials: "SC", bg: "bg-purple-100 text-purple-700" },
  { name: "David Kim", role: "freelancer", email: "david@ai.dev", status: "verified", joined: "Mar 10", earned: "$215K", initials: "DK", bg: "bg-green-100 text-green-700" },
  { name: "Marcus Johnson", role: "client", email: "marcus@startup.io", status: "active", joined: "Jun 1", spent: "$12K", initials: "MJ", bg: "bg-orange-100 text-orange-700" },
];

const FLAGGED_ITEMS = [
  { type: "dispute", description: "Contract #891: Payment dispute - client claims deliverable not met", severity: "high", time: "2 hours ago" },
  { type: "account", description: "Suspicious activity on account priya@design.io - multiple login attempts", severity: "medium", time: "5 hours ago" },
  { type: "fraud", description: "Potential fraudulent job posting ID #234 - keywords match spam patterns", severity: "low", time: "1 day ago" },
];

const PLATFORM_STATS = [
  { label: "Total Users", value: "850,421", change: "+1,234 this week", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Total Escrow Volume", value: "$2.4B", change: "+$4.2M today", icon: Shield, color: "text-primary", bg: "bg-primary/5" },
  { label: "Active Contracts", value: "12,847", change: "+89 today", icon: Briefcase, color: "text-green-600", bg: "bg-green-50" },
  { label: "Platform Revenue", value: "$240M", change: "+$420K this month", icon: DollarSign, color: "text-yellow-600", bg: "bg-yellow-50" },
  { label: "Dispute Rate", value: "0.3%", change: "-0.1% vs last month", icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50" },
  { label: "Escrow Success", value: "99.7%", change: "Industry leading", icon: TrendingUp, color: "text-teal-600", bg: "bg-teal-50" },
];

const CATEGORY_BREAKDOWN = [
  { label: "Development & IT", percent: 42, amount: "$1.01B" },
  { label: "Design & Creative", percent: 21, amount: "$504M" },
  { label: "Finance & Accounting", percent: 15, amount: "$360M" },
  { label: "Writing & Translation", percent: 11, amount: "$264M" },
  { label: "Marketing & Sales", percent: 8, amount: "$192M" },
  { label: "Other", percent: 3, amount: "$72M" },
];

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-secondary/20">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground text-sm">TrustFirst+ Platform Control Center</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {PLATFORM_STATS.map((s, i) => (
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
                  <Badge className="bg-orange-100 text-orange-700 ml-auto">{FLAGGED_ITEMS.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {FLAGGED_ITEMS.map((item, i) => (
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
                      <Button size="sm" variant="outline" className="h-7 text-xs rounded-full">
                        <CheckCircle className="h-3 w-3 mr-1" /> Resolve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs rounded-full border-red-200 text-red-600 hover:bg-red-50">
                        <Ban className="h-3 w-3" />
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
                  {RECENT_USERS.map(u => (
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
                {CATEGORY_BREAKDOWN.map(c => (
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
                {[
                  { label: "API Uptime", value: "99.99%", ok: true },
                  { label: "DB Response", value: "12ms", ok: true },
                  { label: "Escrow Engine", value: "Online", ok: true },
                  { label: "AI Matching", value: "Online", ok: true },
                  { label: "Fraud Detection", value: "Online", ok: true },
                ].map(s => (
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
                {[
                  { label: "User Management", icon: Users },
                  { label: "Escrow Transactions", icon: DollarSign },
                  { label: "Dispute Resolution", icon: AlertTriangle },
                  { label: "Platform Settings", icon: Shield },
                ].map(a => (
                  <Button key={a.label} variant="outline" className="w-full rounded-full justify-start h-9 text-sm">
                    <a.icon className="h-4 w-4 mr-2" /> {a.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
