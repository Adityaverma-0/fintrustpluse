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
import { useWallet } from "@/hooks/use-wallet";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DollarSign, Briefcase, Users, Plus, CheckCircle, Shield, ArrowRight, ChevronRight, Loader2 } from "lucide-react";

export default function ClientDashboard() {
  const { user } = useAuth();
  const { projects, isLoading: projectsLoading } = useProjects();
  const { wallet, isLoading: walletLoading } = useWallet();

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<any[]>({
    queryKey: ["jobs", "mine"],
    queryFn: () => api.get<any[]>("/jobs"),
    enabled: !!user,
    staleTime: 30000,
  });

  const name = user?.name ?? "Client";
  const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const activeProjects = projects.filter(p => p.status === "active");
  const completedProjects = projects.filter(p => p.status === "completed");
  const myJobs = jobs.filter(j => j.clientId === user?.id);
  const openJobs = myJobs.filter(j => j.status === "open");

  const inEscrow = projects.reduce((s, p) => s + (p.milestones?.filter(m => ["funded", "in_progress", "submitted"].includes(m.status)).reduce((a, m) => a + m.amount, 0) ?? 0), 0);
  const totalSpent = wallet?.totalSpent ?? 0;

  const isLoading = projectsLoading || walletLoading || jobsLoading;

  const stats = [
    { label: "Total Spent", value: `$${totalSpent.toLocaleString()}`, sub: `$${inEscrow.toLocaleString()} in escrow`, icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Active Projects", value: String(activeProjects.length), sub: `${completedProjects.length} completed`, icon: Briefcase, color: "text-green-600", bg: "bg-green-50" },
    { label: "Open Jobs", value: String(openJobs.length), sub: `${myJobs.length} total posted`, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Escrow Balance", value: `$${inEscrow.toLocaleString()}`, sub: "Smart Escrow protected", icon: Shield, color: "text-orange-600", bg: "bg-orange-50" },
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
              <p className="text-muted-foreground text-sm">{activeProjects.length} active project{activeProjects.length !== 1 ? "s" : ""} · ${inEscrow.toLocaleString()} in escrow</p>
            </div>
          </div>
          <Link href="/post-job">
            <Button className="bg-primary hover:bg-primary/90 rounded-full items-center gap-2">
              <Plus className="h-4 w-4" /> Post a Job
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
                      <Link href="/post-job"><Button variant="link" className="text-primary text-xs mt-1">Post a Job</Button></Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeProjects.slice(0, 3).map(p => (
                        <div key={p.id} className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{p.title}</p>
                              <p className="text-xs text-muted-foreground">{p.freelancer?.name}</p>
                            </div>
                            <Badge className="bg-green-100 text-green-700 border-0 text-xs">{p.progress ?? 0}%</Badge>
                          </div>
                          <Progress value={p.progress ?? 0} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">Your Job Postings</CardTitle>
                  <Link href="/post-job"><Button variant="ghost" size="sm" className="text-xs h-7 gap-1">Post New <Plus className="h-3 w-3" /></Button></Link>
                </CardHeader>
                <CardContent className="pt-0">
                  {myJobs.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No jobs posted yet</p>
                      <Link href="/post-job"><Button variant="link" className="text-primary text-xs mt-1">Post your first job</Button></Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myJobs.slice(0, 5).map((j: any) => (
                        <div key={j.id} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{j.title}</p>
                            <p className="text-xs text-muted-foreground">{j.proposalCount ?? 0} proposal{(j.proposalCount ?? 0) !== 1 ? "s" : ""}</p>
                          </div>
                          <Badge className={`border-0 text-xs capitalize ${j.status === "open" ? "bg-green-100 text-green-700" : "bg-secondary text-muted-foreground"}`}>{j.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold">Smart Escrow Protection Active</p>
                <p className="text-xs text-muted-foreground">
                  ${inEscrow.toLocaleString()} is protected in escrow. Funds are only released when you approve milestone deliverables.
                </p>
              </div>
              <Link href="/projects" className="ml-auto">
                <Button variant="outline" size="sm" className="rounded-full text-xs">Manage Projects</Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
