import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useProjects } from "@/hooks/use-projects";
import { type Project, type Milestone } from "@/lib/api";
import {
  Briefcase, CheckCircle, Clock, DollarSign, Shield, ChevronRight,
  AlertCircle, Play, PauseCircle, XCircle, Plus, Users, BarChart2,
  FileText, ArrowUpRight, Loader2, RefreshCw
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: "Active", color: "bg-green-100 text-green-700", icon: Play },
  paused: { label: "Paused", color: "bg-yellow-100 text-yellow-700", icon: PauseCircle },
  completed: { label: "Completed", color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: XCircle },
};

const MILESTONE_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-secondary text-muted-foreground" },
  funded: { label: "Funded", color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-700" },
  submitted: { label: "Awaiting Review", color: "bg-orange-100 text-orange-700" },
  approved: { label: "Approved", color: "bg-green-100 text-green-700" },
  rejected: { label: "Revision Requested", color: "bg-red-100 text-red-700" },
  released: { label: "Released", color: "bg-emerald-100 text-emerald-700" },
};

function MilestoneRow({ milestone, isClient, onAction }: { milestone: Milestone; isClient: boolean; onAction: (id: number, status: string) => void }) {
  const cfg = MILESTONE_STATUS[milestone.status] ?? { label: milestone.status, color: "bg-secondary" };
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border bg-background hover:bg-secondary/30 transition-all">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${milestone.status === "released" ? "bg-emerald-500" : milestone.status === "in_progress" ? "bg-yellow-400" : "bg-muted-foreground/30"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{milestone.title}</p>
        <p className="text-xs text-muted-foreground">${milestone.amount.toLocaleString()}</p>
      </div>
      <Badge className={`text-xs ${cfg.color} border-0`}>{cfg.label}</Badge>
      {isClient && milestone.status === "submitted" && (
        <div className="flex gap-1">
          <Button size="sm" className="h-7 text-xs rounded-full" onClick={() => onAction(milestone.id, "approved")}>Approve</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs rounded-full" onClick={() => onAction(milestone.id, "rejected")}>Revise</Button>
        </div>
      )}
      {isClient && milestone.status === "approved" && (
        <Button size="sm" className="h-7 text-xs rounded-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onAction(milestone.id, "released")}>Release</Button>
      )}
      {!isClient && milestone.status === "funded" && (
        <Button size="sm" variant="outline" className="h-7 text-xs rounded-full" onClick={() => onAction(milestone.id, "in_progress")}>Start</Button>
      )}
      {!isClient && milestone.status === "in_progress" && (
        <Button size="sm" className="h-7 text-xs rounded-full" onClick={() => onAction(milestone.id, "submitted")}>Submit</Button>
      )}
      {!isClient && milestone.status === "rejected" && (
        <Button size="sm" className="h-7 text-xs rounded-full bg-orange-500 hover:bg-orange-600 text-white gap-1" onClick={() => onAction(milestone.id, "submitted")}>
          <RefreshCw className="h-3 w-3" />Resubmit
        </Button>
      )}
    </div>
  );
}

function ProjectCard({ project, isClient, onMilestoneAction }: { project: Project; isClient: boolean; onMilestoneAction: (id: number, status: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.active!;
  const StatusIcon = statusCfg.icon;
  const other = isClient ? project.freelancer : project.client;
  const otherInitials = other?.name?.split(" ").map(n => n[0]).join("") ?? "?";

  const escrowLocked = project.milestones?.filter(m => ["funded", "in_progress", "submitted"].includes(m.status)).reduce((s, m) => s + m.amount, 0) ?? 0;
  const paid = project.milestones?.filter(m => m.status === "released").reduce((s, m) => s + m.amount, 0) ?? 0;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} layout>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <button className="w-full text-left p-5" onClick={() => setExpanded(e => !e)}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-base truncate">{project.title}</h3>
                  <Badge className={`${statusCfg.color} border-0 text-xs gap-1 flex-shrink-0`}>
                    <StatusIcon className="h-2.5 w-2.5" /> {statusCfg.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${project.budget.toLocaleString()} total</span>
                  {escrowLocked > 0 && <span className="flex items-center gap-1 text-primary"><Shield className="h-3 w-3" />${escrowLocked.toLocaleString()} in escrow</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {other && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs bg-blue-100 text-blue-700">{otherInitials}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground hidden sm:block">{other.name}</span>
                  </div>
                )}
                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
              </div>
            </div>

            {project.progress !== undefined && project.milestones && project.milestones.length > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{project.milestones.filter(m => m.status === "released").length}/{project.milestones.length} milestones completed</span>
                  <span className="font-medium">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-1.5" />
              </div>
            )}
          </button>

          {expanded && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 pb-5 space-y-2">
              {project.milestones && project.milestones.length > 0 ? (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Milestones</p>
                  {project.milestones.map(m => (
                    <MilestoneRow key={m.id} milestone={m} isClient={isClient} onAction={onMilestoneAction} />
                  ))}
                </>
              ) : (
                <div className="text-center text-sm text-muted-foreground py-4">
                  No milestones yet.
                </div>
              )}
              <div className="pt-2">
                <Link href={`/projects/${project.id}`}>
                  <Button variant="outline" size="sm" className="rounded-full text-xs gap-1 w-full">
                    <ArrowUpRight className="h-3 w-3" /> View Full Details
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const { projects, isLoading, updateMilestoneStatus } = useProjects();
  const isClient = user?.role === "client";
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? projects : projects.filter(p => p.status === filter);

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === "active").length,
    completed: projects.filter(p => p.status === "completed").length,
    inEscrow: projects.reduce((s, p) => s + (p.milestones?.filter(m => ["funded", "in_progress", "submitted"].includes(m.status)).reduce((a, m) => a + m.amount, 0) ?? 0), 0),
  };

  function handleMilestoneAction(id: number, status: string) {
    updateMilestoneStatus.mutate({ id, status });
  }

  return (
    <div className="min-h-screen bg-secondary/20">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold">Projects</h1>
              <p className="text-muted-foreground text-sm">Manage your active contracts and milestones</p>
            </div>
            {isClient && (
              <Link href="/post-job">
                <Button className="bg-primary hover:bg-primary/90 rounded-full gap-2">
                  <Plus className="h-4 w-4" /> Post New Job
                </Button>
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Projects", value: stats.total, icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Active", value: stats.active, icon: Play, color: "text-green-600", bg: "bg-green-50" },
              { label: "Completed", value: stats.completed, icon: CheckCircle, color: "text-primary", bg: "bg-primary/5" },
              { label: "In Escrow", value: `$${stats.inEscrow.toLocaleString()}`, icon: Shield, color: "text-orange-600", bg: "bg-orange-50" },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.bg}`}>
                        <s.icon className={`h-4 w-4 ${s.color}`} />
                      </div>
                      <span className="text-sm text-muted-foreground">{s.label}</span>
                    </div>
                    <div className="text-2xl font-bold">{s.value}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="flex gap-2 mb-6 flex-wrap">
            {["all", "active", "paused", "completed", "cancelled"].map(f => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                className="rounded-full capitalize text-xs h-8"
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "All Projects" : f}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Briefcase className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold text-lg mb-2">No projects yet</h3>
                <p className="text-muted-foreground text-sm text-center max-w-sm">
                  {isClient ? "Post a job and hire freelancers to start a project." : "Apply to jobs to start working on projects."}
                </p>
                {isClient && (
                  <Link href="/post-job">
                    <Button className="mt-4 rounded-full bg-primary hover:bg-primary/90">Post a Job</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filtered.map(p => (
                <ProjectCard key={p.id} project={p} isClient={isClient} onMilestoneAction={handleMilestoneAction} />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
