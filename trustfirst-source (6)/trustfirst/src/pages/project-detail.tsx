import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useProjects } from "@/hooks/use-projects";
import { api, type Project } from "@/lib/api";
import {
  ArrowLeft, Briefcase, CheckCircle, Clock, DollarSign, Shield,
  AlertCircle, Play, PauseCircle, XCircle, Loader2, User,
  Calendar, FileText, ChevronRight, RefreshCw
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active:    { label: "Active",    color: "bg-green-100 text-green-700",  icon: Play },
  paused:    { label: "Paused",    color: "bg-yellow-100 text-yellow-700", icon: PauseCircle },
  completed: { label: "Completed", color: "bg-blue-100 text-blue-700",    icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700",      icon: XCircle },
};

const MILESTONE_STATUS: Record<string, { label: string; color: string }> = {
  pending:    { label: "Pending",           color: "bg-secondary text-muted-foreground" },
  funded:     { label: "Funded",            color: "bg-blue-100 text-blue-700" },
  in_progress:{ label: "In Progress",       color: "bg-yellow-100 text-yellow-700" },
  submitted:  { label: "Awaiting Review",   color: "bg-orange-100 text-orange-700" },
  approved:   { label: "Approved",          color: "bg-green-100 text-green-700" },
  rejected:   { label: "Revision Needed",   color: "bg-red-100 text-red-700" },
  released:   { label: "Payment Released",  color: "bg-emerald-100 text-emerald-700" },
};

function formatDate(d: string | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id ?? "");
  const { user } = useAuth();
  const { updateMilestoneStatus, updateStatus } = useProjects();

  const { data: project, isLoading, error, refetch } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: () => api.get<Project>(`/projects/${projectId}`),
    enabled: !isNaN(projectId),
    staleTime: 15000,
  });

  const isClient = user?.role === "client";

  function handleMilestoneAction(milestoneId: number, status: string) {
    updateMilestoneStatus.mutate(
      { id: milestoneId, status },
      { onSuccess: () => refetch() }
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary/20">
        <Navbar />
        <div className="flex items-center justify-center py-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-secondary/20">
        <Navbar />
        <div className="container mx-auto px-4 py-20 max-w-lg text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Project not found</h2>
          <p className="text-muted-foreground text-sm mb-6">
            This project doesn't exist or you don't have access to it.
          </p>
          <Link href="/projects">
            <Button className="rounded-full gap-2 bg-primary hover:bg-primary/90">
              <ArrowLeft className="h-4 w-4" /> Back to Projects
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.active!;
  const StatusIcon = statusCfg.icon;
  const milestones = project.milestones ?? [];
  const total = milestones.reduce((s, m) => s + m.amount, 0);
  const released = milestones.filter(m => m.status === "released").reduce((s, m) => s + m.amount, 0);
  const escrow = milestones.filter(m => ["funded","in_progress","submitted"].includes(m.status)).reduce((s, m) => s + m.amount, 0);
  const progress = total > 0 ? Math.round((released / total) * 100) : 0;
  const other = isClient ? project.freelancer : project.client;
  const otherLabel = isClient ? "Freelancer" : "Client";
  const otherInitials = other?.name?.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase() ?? "?";

  return (
    <div className="min-h-screen bg-secondary/20">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back nav */}
        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="mb-6">
          <Link href="/projects">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground rounded-full pl-2">
              <ArrowLeft className="h-4 w-4" /> All Projects
            </Button>
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h1 className="text-2xl font-bold">{project.title}</h1>
                    <Badge className={`${statusCfg.color} border-0 gap-1`}>
                      <StatusIcon className="h-3 w-3" /> {statusCfg.label}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">{project.description}</p>
                </div>
                {/* Client-only status controls */}
                {isClient && project.status === "active" && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full text-xs gap-1"
                      onClick={() => updateStatus.mutate({ id: project.id, status: "paused" }, { onSuccess: () => refetch() })}
                    >
                      <PauseCircle className="h-3 w-3" /> Pause
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full text-xs gap-1 border-green-200 text-green-700 hover:bg-green-50"
                      onClick={() => updateStatus.mutate({ id: project.id, status: "completed" }, { onSuccess: () => refetch() })}
                    >
                      <CheckCircle className="h-3 w-3" /> Complete
                    </Button>
                  </div>
                )}
                {isClient && project.status === "paused" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full text-xs gap-1 flex-shrink-0"
                    onClick={() => updateStatus.mutate({ id: project.id, status: "active" }, { onSuccess: () => refetch() })}
                  >
                    <Play className="h-3 w-3" /> Resume
                  </Button>
                )}
              </div>

              <Separator className="my-5" />

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-xl bg-secondary/50">
                  <p className="text-xs text-muted-foreground mb-1">Budget</p>
                  <p className="font-bold text-lg">${project.budget.toLocaleString()}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-primary/5">
                  <p className="text-xs text-muted-foreground mb-1">In Escrow</p>
                  <p className="font-bold text-lg text-primary">${escrow.toLocaleString()}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-emerald-50">
                  <p className="text-xs text-muted-foreground mb-1">Released</p>
                  <p className="font-bold text-lg text-emerald-700">${released.toLocaleString()}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-blue-50">
                  <p className="text-xs text-muted-foreground mb-1">Milestones</p>
                  <p className="font-bold text-lg text-blue-700">
                    {milestones.filter(m => m.status === "released").length}/{milestones.length}
                  </p>
                </div>
              </div>

              {milestones.length > 0 && (
                <div className="mt-5">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-muted-foreground">Overall Progress</span>
                    <span className="font-semibold">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2.5 rounded-full" />
                </div>
              )}

              {/* Deadline */}
              {project.deadline && (
                <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Deadline: <span className="text-foreground font-medium">{formatDate(project.deadline)}</span></span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Milestones */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Milestones
                  {milestones.length > 0 && (
                    <Badge variant="secondary" className="ml-auto text-xs font-normal">
                      {milestones.filter(m => m.status === "released").length} of {milestones.length} released
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {milestones.length === 0 ? (
                  <div className="text-center py-10">
                    <FileText className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No milestones added yet.</p>
                    {isClient && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Use the API to add milestones to this project.
                      </p>
                    )}
                  </div>
                ) : (
                  milestones
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((m, idx) => {
                      const cfg = MILESTONE_STATUS[m.status] ?? { label: m.status, color: "bg-secondary" };
                      const dotColor =
                        m.status === "released" ? "bg-emerald-500" :
                        m.status === "approved"  ? "bg-green-400" :
                        m.status === "in_progress" ? "bg-yellow-400" :
                        m.status === "submitted" ? "bg-orange-400" :
                        m.status === "rejected"  ? "bg-red-400" :
                        m.status === "funded"    ? "bg-blue-400" :
                        "bg-muted-foreground/30";

                      return (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.06 }}
                          className="rounded-xl border bg-background p-4 hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div>
                                  <p className="font-medium text-sm">{m.title}</p>
                                  {m.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="font-semibold text-sm">${m.amount.toLocaleString()}</span>
                                  <Badge className={`${cfg.color} border-0 text-xs`}>{cfg.label}</Badge>
                                </div>
                              </div>

                              {/* Deliverables */}
                              {m.deliverables && (
                                <div className="mt-2 p-2.5 rounded-lg bg-secondary/60 text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground">Deliverables: </span>
                                  {m.deliverables}
                                </div>
                              )}

                              {/* Client feedback */}
                              {m.clientFeedback && (
                                <div className="mt-2 p-2.5 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700">
                                  <span className="font-medium">Feedback: </span>
                                  {m.clientFeedback}
                                </div>
                              )}

                              {/* Dates */}
                              {(m.dueDate || m.submittedAt || m.approvedAt) && (
                                <div className="flex gap-3 mt-2 flex-wrap">
                                  {m.dueDate && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" /> Due {formatDate(m.dueDate)}
                                    </span>
                                  )}
                                  {m.submittedAt && (
                                    <span className="text-xs text-muted-foreground">
                                      Submitted {formatDate(m.submittedAt)}
                                    </span>
                                  )}
                                  {m.approvedAt && (
                                    <span className="text-xs text-muted-foreground">
                                      Approved {formatDate(m.approvedAt)}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Action buttons */}
                              <div className="flex gap-2 mt-3 flex-wrap">
                                {/* Freelancer actions */}
                                {!isClient && m.status === "funded" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs rounded-full gap-1"
                                    disabled={updateMilestoneStatus.isPending}
                                    onClick={() => handleMilestoneAction(m.id, "in_progress")}
                                  >
                                    <Play className="h-3 w-3" /> Start Work
                                  </Button>
                                )}
                                {!isClient && m.status === "in_progress" && (
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs rounded-full bg-primary hover:bg-primary/90 gap-1"
                                    disabled={updateMilestoneStatus.isPending}
                                    onClick={() => handleMilestoneAction(m.id, "submitted")}
                                  >
                                    <ChevronRight className="h-3 w-3" /> Submit for Review
                                  </Button>
                                )}
                                {!isClient && (m.status === "rejected" || m.status === "funded") && m.status !== "funded" && (
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs rounded-full bg-orange-500 hover:bg-orange-600 text-white gap-1"
                                    disabled={updateMilestoneStatus.isPending}
                                    onClick={() => handleMilestoneAction(m.id, "submitted")}
                                  >
                                    <RefreshCw className="h-3 w-3" /> Resubmit
                                  </Button>
                                )}

                                {/* Client actions */}
                                {isClient && m.status === "submitted" && (
                                  <>
                                    <Button
                                      size="sm"
                                      className="h-7 text-xs rounded-full bg-green-600 hover:bg-green-700 text-white gap-1"
                                      disabled={updateMilestoneStatus.isPending}
                                      onClick={() => handleMilestoneAction(m.id, "approved")}
                                    >
                                      <CheckCircle className="h-3 w-3" /> Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs rounded-full gap-1"
                                      disabled={updateMilestoneStatus.isPending}
                                      onClick={() => handleMilestoneAction(m.id, "rejected")}
                                    >
                                      <AlertCircle className="h-3 w-3" /> Request Revision
                                    </Button>
                                  </>
                                )}
                                {isClient && m.status === "approved" && (
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs rounded-full bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                    disabled={updateMilestoneStatus.isPending}
                                    onClick={() => handleMilestoneAction(m.id, "released")}
                                  >
                                    <DollarSign className="h-3 w-3" /> Release Payment
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            {/* Counterparty info */}
            {other && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground font-normal">{otherLabel}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-sm">{otherInitials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">{other.name}</p>
                      {("title" in other) && (other as { title?: string | null }).title && (
                        <p className="text-xs text-muted-foreground">{(other as { title?: string | null }).title}</p>
                      )}
                      {("email" in other) && (other as { email?: string }).email && (
                        <p className="text-xs text-muted-foreground">{(other as { email?: string }).email}</p>
                      )}
                    </div>
                  </div>
                  <Link href="/messages">
                    <Button variant="outline" size="sm" className="w-full mt-3 rounded-full text-xs gap-2">
                      Send Message
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Escrow info */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">Smart Escrow</p>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Locked in escrow</span>
                    <span className="font-semibold text-primary">${escrow.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Released to freelancer</span>
                    <span className="font-semibold text-emerald-700">${released.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total budget</span>
                    <span className="font-semibold">${project.budget.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project dates */}
            <Card>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Started {formatDate(project.createdAt)}</span>
                </div>
                {project.deadline && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Deadline {formatDate(project.deadline)}</span>
                  </div>
                )}
                {project.completedAt && (
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Completed {formatDate(project.completedAt)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
