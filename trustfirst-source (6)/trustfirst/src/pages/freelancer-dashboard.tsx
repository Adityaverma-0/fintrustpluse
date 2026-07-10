import { Link } from "wouter";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { useProjects } from "@/hooks/use-projects";
import { useMyProposals } from "@/hooks/use-proposals";
import { useWallet } from "@/hooks/use-wallet";
import { TrendingUp, DollarSign, Briefcase, Star, CheckCircle, ArrowRight, Shield, Loader2, FileText, ChevronRight } from "lucide-react";

const PROPOSAL_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700" },
  accepted: { label: "Accepted", color: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
  withdrawn: { label: "Withdrawn", color: "bg-secondary text-muted-foreground" },
};

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function FreelancerDashboard() {
  const { user } = useAuth();
  const { projects, isLoading: projectsLoading } = useProjects();
  const { proposals, isLoading: proposalsLoading } = useMyProposals();
  const { wallet, isLoading: walletLoading } = useWallet();

  const name = user?.name ?? "Freelancer";
  const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const activeProjects = projects.filter(p => p.status === "active");
  const completedProjects = projects.filter(p => p.status === "completed");
  const pendingProposals = proposals.filter(p => p.status === "pending");

  const isLoading = projectsLoading || proposalsLoading || walletLoading;

  const stats = [
    { label: "Total Earned", value: `$${(wallet?.totalEarned ?? 0).toLocaleString()}`, sub: `$${(wallet?.availableBalance ?? 0).toLocaleString()} available`, icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
    { label: "Active Projects", value: String(activeProjects.length), sub: `${completedProjects.length} completed`, icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "In Escrow", value: `$${(wallet?.escrowBalance ?? 0).toLocaleString()}`, sub: "Protected by Smart Escrow", icon: Shield, color: "text-primary", bg: "bg-primary/5" },
    { label: "Trust Score", value: `${user?.trustScore ?? 0}/100`, sub: "Based on your history", icon: Star, color: "text-yellow-600", bg: "bg-yellow-50" },
  ];

  return (
    <div className="min-h-screen bg-secondary/20">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">Welcome back, {name.split(" ")[0]}!</h1>
              <p className="text-muted-foreground text-sm">{activeProjects.length} active project{activeProjects.length !== 1 ? "s" : ""} · {pendingProposals.length} pending proposal{pendingProposals.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <Link href="/jobs">
            <Button className="bg-primary hover:bg-primary/90 rounded-full items-center gap-2">
              Find New Jobs <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {stats.map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <Card>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.bg}`}>
                          <s.icon className={`h-4 w-4 ${s.color}`} />
                        </div>
                        <span className="text-xs text-muted-foreground">{s.label}</span>
                      </div>
                      <div className="text-2xl font-bold">{s.value}</div>
                      <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">Active Projects</CardTitle>
                  <Link href="/projects"><Button variant="ghost" size="sm" className="text-xs h-7 gap-1">View all <ChevronRight className="h-3 w-3" /></Button></Link>
                </CardHeader>
                <CardContent className="pt-0">
                  {activeProjects.length === 0 ? (
                    <div className="text-center py-8">
                      <Briefcase className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No active projects yet</p>
                      <Link href="/jobs"><Button variant="link" className="text-primary text-xs mt-1">Browse Jobs</Button></Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeProjects.slice(0, 3).map(p => {
                        const escrow = p.milestones?.filter(m => ["funded", "in_progress", "submitted"].includes(m.status)).reduce((s, m) => s + m.amount, 0) ?? 0;
                        return (
                          <div key={p.id} className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{p.title}</p>
                                <p className="text-xs text-muted-foreground">{p.client?.name} · ${escrow.toLocaleString()} in escrow</p>
                              </div>
                              <Badge className="bg-green-100 text-green-700 border-0 text-xs">{p.progress ?? 0}%</Badge>
                            </div>
                            <Progress value={p.progress ?? 0} className="h-1.5" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">Recent Proposals</CardTitle>
                  <Link href="/jobs"><Button variant="ghost" size="sm" className="text-xs h-7 gap-1">Find Jobs <ChevronRight className="h-3 w-3" /></Button></Link>
                </CardHeader>
                <CardContent className="pt-0">
                  {proposals.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No proposals submitted yet</p>
                      <Link href="/jobs"><Button variant="link" className="text-primary text-xs mt-1">Browse Jobs</Button></Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {proposals.slice(0, 5).map(p => {
                        const cfg = PROPOSAL_STATUS[p.status] ?? { label: p.status, color: "bg-secondary" };
                        return (
                          <div key={p.id} className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{p.job?.title ?? `Job #${p.jobId}`}</p>
                              <p className="text-xs text-muted-foreground">${p.bidAmount.toLocaleString()} · {timeAgo(p.createdAt)}</p>
                            </div>
                            <Badge className={`${cfg.color} border-0 text-xs`}>{cfg.label}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold">Smart Escrow Protection</p>
                <p className="text-xs text-muted-foreground">
                  ${(wallet?.escrowBalance ?? 0).toLocaleString()} is securely held and released when your milestones are approved.
                </p>
              </div>
              <Link href="/wallet" className="ml-auto">
                <Button variant="outline" size="sm" className="rounded-full text-xs">View Wallet</Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
