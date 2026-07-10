import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useProjects } from "@/hooks/use-projects";
import { api, type Project } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  ArrowLeft, Briefcase, CheckCircle, Clock, DollarSign, Shield,
  AlertCircle, Play, PauseCircle, XCircle, Loader2, User,
  Calendar, FileText, ChevronRight, RefreshCw, UploadCloud,
  Check, File, Github, ExternalLink, MessageSquare, Star,
  ArrowUpRight, FolderOpen, Trash2
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  accepted:  { label: "Accepted",  color: "bg-blue-100 text-blue-700",    icon: Clock },
  active:    { label: "Active",    color: "bg-green-100 text-green-700",  icon: Play },
  paused:    { label: "Paused",    color: "bg-yellow-100 text-yellow-700", icon: PauseCircle },
  completed: { label: "Completed", color: "bg-blue-100 text-blue-700",    icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700",      icon: XCircle },
  disputed:  { label: "Disputed",   color: "bg-red-200 text-red-800",      icon: AlertCircle },
};

const MILESTONE_STATUS: Record<string, { label: string; color: string }> = {
  pending:    { label: "Pending",           color: "bg-secondary text-muted-foreground" },
  funded:     { label: "Funded",            color: "bg-blue-100 text-blue-700" },
  in_progress:{ label: "In Progress",       color: "bg-yellow-100 text-yellow-700" },
  submitted:  { label: "Awaiting Review",   color: "bg-orange-100 text-orange-700" },
  approved:   { label: "Approved",          color: "bg-green-100 text-green-700" },
  rejected:   { label: "Revision Needed",   color: "bg-red-100 text-red-700" },
  released:   { label: "Payment Released",  color: "bg-emerald-100 text-emerald-700" },
  disputed:   { label: "Disputed",          color: "bg-red-200 text-red-850" },
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
  const { toast } = useToast();
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDesc, setDisputeDesc] = useState("");

  // Submissions & comments state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<number | null>(null);
  const [submissionTitle, setSubmissionTitle] = useState("");
  const [submissionDesc, setSubmissionDesc] = useState("");
  const [submissionWorkSummary, setSubmissionWorkSummary] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [submissionTech, setSubmissionTech] = useState("");
  const [submissionVersion, setSubmissionVersion] = useState("1.0.0");
  const [submissionTime, setSubmissionTime] = useState<number>(8);
  const [githubRepo, setGithubRepo] = useState("");
  const [liveDemoUrl, setLiveDemoUrl] = useState("");
  const [figmaLink, setFigmaLink] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; type: string; size: number; url: string; progress?: number; status?: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Client review state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewSubmissionId, setReviewSubmissionId] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewAction, setReviewAction] = useState<"approve" | "revision" | "reject" | null>(null);

  // File preview state
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string; type: string } | null>(null);

  // Comments state
  const [commentText, setCommentText] = useState("");

  const { data: projectSubmissions = [], refetch: refetchSubmissions } = useQuery<any[]>({
    queryKey: ["project-submissions", projectId],
    queryFn: () => api.get<any[]>(`/projects/${projectId}/milestone-submissions`),
    enabled: !isNaN(projectId),
    staleTime: 10000,
  });

  const submitMilestone = useMutation({
    mutationFn: (body: any) => api.post(`/projects/${projectId}/milestones/${selectedMilestoneId}/submit`, body),
    onSuccess: () => {
      toast({ title: "Milestone submitted!", description: "The client has been notified to review your work." });
      setShowSubmitModal(false);
      setSubmissionTitle("");
      setSubmissionDesc("");
      setSubmissionWorkSummary("");
      setSubmissionNotes("");
      setSubmissionTech("");
      setSubmissionVersion("1.0.0");
      setSubmissionTime(8);
      setGithubRepo("");
      setLiveDemoUrl("");
      setFigmaLink("");
      setAttachedFiles([]);
      refetch();
      refetchSubmissions();
    },
    onError: (err: any) => {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    }
  });

  const submitReview = useMutation({
    mutationFn: ({ submissionId, action, body }: { submissionId: number, action: "approve" | "revision" | "reject", body: any }) =>
      api.post(`/submission/${submissionId}/${action}`, body),
    onSuccess: () => {
      toast({ title: "Submission review updated", description: "Action successfully processed." });
      setShowReviewModal(false);
      setReviewComment("");
      refetch();
      refetchSubmissions();
    },
    onError: (err: any) => {
      toast({ title: "Review failed", description: err.message, variant: "destructive" });
    }
  });

  const postComment = useMutation({
    mutationFn: ({ submissionId, body }: { submissionId: number, body: any }) =>
      api.post(`/submission/${submissionId}/comment`, body),
    onSuccess: () => {
      setCommentText("");
      refetchSubmissions();
    },
    onError: (err: any) => {
      toast({ title: "Failed to post comment", description: err.message, variant: "destructive" });
    }
  });

  const handleUploadSubmit = () => {
    if (!submissionTitle.trim()) {
      toast({ title: "Validation Error", description: "Submission title is required.", variant: "destructive" });
      return;
    }
    if (attachedFiles.length === 0) {
      toast({ title: "Validation Error", description: "Please attach at least one deliverable file.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          submitMilestone.mutate({
            title: submissionTitle.trim(),
            description: submissionDesc.trim(),
            workSummary: submissionWorkSummary.trim(),
            completionNotes: submissionNotes.trim(),
            technologiesUsed: submissionTech.trim(),
            timeSpent: submissionTime,
            projectVersion: submissionVersion,
            githubRepo: githubRepo.trim(),
            liveDemoUrl: liveDemoUrl.trim(),
            figmaLink: figmaLink.trim(),
            files: attachedFiles.map(f => ({
              filename: f.name,
              fileType: f.type,
              fileSize: f.size,
              fileUrl: f.url,
              fileHash: "sha256_" + Math.random().toString(36).substring(7),
            })),
          });
          return 100;
        }
        return prev + 20;
      });
    }, 150);
  };

  const getRemainingDays = (dueDateStr: string | null) => {
    if (!dueDateStr) return "N/A";
    const due = new Date(dueDateStr);
    const today = new Date();
    const diff = due.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} days left` : days === 0 ? "Due today" : `${Math.abs(days)} days overdue`;
  };

  const fundEscrow = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/escrow/fund`, { amount: project ? Number(project.budget) : 0 }),
    onSuccess: () => {
      toast({ title: "Escrow funded successfully!", description: "Work can now begin! The workspace is now unlocked." });
      refetch();
    },
    onError: (err: any) => {
      toast({ title: "Funding failed", description: err.message, variant: "destructive" });
    }
  });

  const raiseDispute = useMutation({
    mutationFn: (body: { reason: string; description: string }) =>
      api.post(`/projects/${projectId}/disputes`, body),
    onSuccess: () => {
      toast({ title: "Dispute raised", description: "Escrow funds have been successfully frozen. Admin team is notified." });
      setShowDisputeModal(false);
      refetch();
    },
    onError: (err: any) => {
      toast({ title: "Failed to raise dispute", description: err.message, variant: "destructive" });
    }
  });

  const releaseMilestonePayment = useMutation({
    mutationFn: (milestoneId: number) => api.post(`/projects/${projectId}/milestones/${milestoneId}/release`, {}),
    onSuccess: () => {
      toast({ title: "Payment released!", description: "Funds have been transferred to the freelancer's wallet." });
      refetch();
    },
    onError: (err: any) => {
      toast({ title: "Failed to release payment", description: err.message, variant: "destructive" });
    }
  });

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
  const actionsDisabled = updateMilestoneStatus.isPending || ["disputed", "accepted"].includes(project.status);
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

        {/* Banners */}
        {project.status === "accepted" && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-blue-900 text-sm">Escrow Deposit Required</h3>
                    <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                      {isClient
                        ? `A secure escrow deposit of $${project.budget.toLocaleString()} is required before project workspace, messaging, and tracking can begin.`
                        : `Waiting for the client to fund the escrow account of $${project.budget.toLocaleString()} before work can begin.`
                      }
                    </p>
                  </div>
                </div>
                {isClient && (
                  <Button
                    size="sm"
                    className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs gap-1"
                    disabled={fundEscrow.isPending}
                    onClick={() => fundEscrow.mutate()}
                  >
                    {fundEscrow.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <DollarSign className="h-3 w-3" />}
                    Deposit ${project.budget.toLocaleString()} Upfront
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {project.status === "disputed" && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 animate-pulse">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-5 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-900 text-sm">Project Escrow Frozen (In Dispute)</h3>
                  <p className="text-xs text-red-700 mt-1 leading-relaxed font-medium">
                    This project is currently disputed. All escrow transfers and milestone approvals are frozen. Admin mediation is in progress.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

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
                    {released >= total && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full text-xs gap-1 border-green-200 text-green-700 hover:bg-green-50"
                        onClick={() => updateStatus.mutate({ id: project.id, status: "completed" }, { onSuccess: () => refetch() })}
                      >
                        <CheckCircle className="h-3 w-3" /> Complete
                      </Button>
                    )}
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
                                    disabled={actionsDisabled}
                                    onClick={() => handleMilestoneAction(m.id, "in_progress")}
                                  >
                                    <Play className="h-3 w-3" /> Start Work
                                  </Button>
                                )}
                                {!isClient && m.status === "in_progress" && (
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs rounded-full bg-primary hover:bg-primary/90 gap-1"
                                    disabled={actionsDisabled}
                                    onClick={() => {
                                      setSelectedMilestoneId(m.id);
                                      setSubmissionTitle(`Deliverable for Milestone: ${m.title}`);
                                      setSubmissionVersion(projectSubmissions.filter(s => s.milestoneId === m.id).length > 0 ? `1.0.${projectSubmissions.filter(s => s.milestoneId === m.id).length + 1}` : "1.0.0");
                                      setShowSubmitModal(true);
                                    }}
                                  >
                                    <ChevronRight className="h-3 w-3" /> Submit for Review
                                  </Button>
                                )}
                                {!isClient && (m.status === "rejected" || m.status === "funded") && m.status !== "funded" && (
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs rounded-full bg-orange-500 hover:bg-orange-600 text-white gap-1"
                                    disabled={actionsDisabled}
                                    onClick={() => {
                                      setSelectedMilestoneId(m.id);
                                      setSubmissionTitle(`Deliverable for Milestone: ${m.title}`);
                                      setSubmissionVersion(projectSubmissions.filter(s => s.milestoneId === m.id).length > 0 ? `1.0.${projectSubmissions.filter(s => s.milestoneId === m.id).length + 1}` : "1.0.0");
                                      setShowSubmitModal(true);
                                    }}
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
                                      disabled={actionsDisabled}
                                      onClick={() => handleMilestoneAction(m.id, "approved")}
                                    >
                                      <CheckCircle className="h-3 w-3" /> Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs rounded-full gap-1"
                                      disabled={actionsDisabled}
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
                                    disabled={actionsDisabled || releaseMilestonePayment.isPending}
                                    onClick={() => releaseMilestonePayment.mutate(m.id)}
                                  >
                                    {releaseMilestonePayment.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <DollarSign className="h-3 w-3" />}
                                    Release Payment
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
            {/* Submit Milestone Section (Freelancer Only) */}
            {!isClient && (
              <Card className="mt-6 border-primary/20 bg-primary/[0.01]">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <UploadCloud className="h-4 w-4 text-primary" />
                    📦 Submit Milestone
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {project.status !== "active" ? (
                    <div className="rounded-xl border border-dashed p-6 text-center space-y-3 bg-secondary/15">
                      <Shield className="h-8 w-8 text-primary/60 mx-auto animate-pulse" />
                      <div className="max-w-xs mx-auto space-y-1">
                        <h4 className="font-semibold text-sm">Submit Deliverables (Locked)</h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Escrow must be funded by client before deliverables can be submitted. Currently, the project status is in <span className="font-semibold capitalize text-primary">{project.status}</span>.
                        </p>
                      </div>
                    </div>
                  ) : milestones.filter(m => ["in_progress", "funded", "rejected"].includes(m.status)).length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No milestones are currently active or revision-requested for submission.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Select Active Milestone</label>
                        <select
                          className="w-full text-sm rounded-lg border bg-background p-2.5 outline-none focus:ring-1 focus:ring-primary"
                          value={selectedMilestoneId ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedMilestoneId(val ? Number(val) : null);
                          }}
                        >
                          <option value="">-- Choose milestone to submit --</option>
                          {milestones
                            .filter(m => ["in_progress", "funded", "rejected"].includes(m.status))
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                Milestone #{m.order}: {m.title} (${Number(m.amount).toLocaleString()})
                              </option>
                            ))}
                        </select>
                      </div>

                      {(() => {
                        const m = milestones.find(item => item.id === selectedMilestoneId);
                        if (!m) return null;
                        const remaining = getRemainingDays(m.dueDate);
                        return (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl border p-4 bg-background space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div>
                                <h4 className="font-semibold text-sm">{m.title}</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">{m.description || "No description provided."}</p>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-sm block">${Number(m.amount).toLocaleString()}</span>
                                <Badge className="text-xs bg-blue-50 text-blue-700 mt-1 border-none">{m.status === "rejected" ? "Revision Needed" : "Awaiting Work"}</Badge>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
                              <div>
                                <span className="text-muted-foreground block">Due Date</span>
                                <span className="font-medium">{formatDate(m.dueDate) || "Flexible"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block">Remaining Time</span>
                                <span className={`font-semibold ${remaining.includes("overdue") ? "text-red-650" : "text-foreground"}`}>
                                  {remaining}
                                </span>
                              </div>
                            </div>

                            <Button
                              className="w-full mt-2 rounded-full gap-2 text-xs font-semibold bg-primary hover:bg-primary/90"
                              onClick={() => {
                                setSubmissionTitle(`Deliverable for Milestone: ${m.title}`);
                                setSubmissionVersion(projectSubmissions.filter(s => s.milestoneId === m.id).length > 0 ? `1.0.${projectSubmissions.filter(s => s.milestoneId === m.id).length + 1}` : "1.0.0");
                                setShowSubmitModal(true);
                              }}
                            >
                              <UploadCloud className="h-4 w-4" /> Submit Milestone Deliverables
                            </Button>
                          </motion.div>
                        );
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Submissions History & Review Section */}
            {projectSubmissions.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-primary" />
                    🔍 Deliverables & Submissions Review
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {projectSubmissions.map((sub, sIdx) => {
                    const m = milestones.find(item => item.id === sub.milestoneId);
                    const formattedDate = new Date(sub.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit"
                    });

                    const subStatusColors: Record<string, string> = {
                      submitted: "bg-blue-50 text-blue-700",
                      under_review: "bg-yellow-50 text-yellow-700",
                      revision_requested: "bg-orange-50 text-orange-700",
                      approved: "bg-green-50 text-green-700",
                      rejected: "bg-red-50 text-red-700",
                      released: "bg-emerald-50 text-emerald-700",
                    };

                    return (
                      <motion.div
                        key={sub.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: sIdx * 0.05 }}
                        className="rounded-xl border bg-background overflow-hidden"
                      >
                        {/* Sub Header */}
                        <div className="p-4 bg-secondary/30 flex items-start justify-between gap-4 flex-wrap border-b">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-sm">{sub.title}</h4>
                              <Badge variant="outline" className="text-xs py-0 px-1.5 font-normal">v{sub.projectVersion}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Submitted for {m ? `Milestone #${m.order}: ${m.title}` : "Project"} on {formattedDate}
                            </p>
                          </div>
                          <Badge className={`${subStatusColors[sub.status] ?? "bg-secondary text-muted-foreground"} border-none capitalize`}>
                            {sub.status === "revision_requested" ? "Revision Requested" : sub.status}
                          </Badge>
                        </div>

                        {/* Sub Body */}
                        <div className="p-4 space-y-4">
                          {/* Deliverables details */}
                          <div className="grid sm:grid-cols-2 gap-4 text-xs">
                            {sub.technologiesUsed && (
                              <div>
                                <span className="text-muted-foreground block mb-0.5">Technologies Used</span>
                                <span className="font-medium text-foreground bg-secondary/50 px-2 py-0.5 rounded">{sub.technologiesUsed}</span>
                              </div>
                            )}
                            {sub.timeSpent && (
                              <div>
                                <span className="text-muted-foreground block mb-0.5">Time Logged</span>
                                <span className="font-medium text-foreground">{sub.timeSpent} hours</span>
                              </div>
                            )}
                          </div>

                          {sub.workSummary && (
                            <div className="space-y-1">
                              <span className="text-xs font-semibold text-muted-foreground">Work Summary</span>
                              <p className="text-xs text-foreground bg-secondary/35 p-3 rounded-lg leading-relaxed whitespace-pre-line">{sub.workSummary}</p>
                            </div>
                          )}

                          {sub.completionNotes && (
                            <div className="space-y-1">
                              <span className="text-xs font-semibold text-muted-foreground">Completion Notes</span>
                              <p className="text-xs text-muted-foreground leading-relaxed">{sub.completionNotes}</p>
                            </div>
                          )}

                          {/* Action Links */}
                          <div className="flex flex-wrap gap-3 pt-1">
                            {sub.githubRepo && (
                              <a
                                href={sub.githubRepo}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-full"
                              >
                                <Github className="h-3 w-3" /> GitHub Repo <ArrowUpRight className="h-2.5 w-2.5" />
                              </a>
                            )}
                            {sub.liveDemoUrl && (
                              <a
                                href={sub.liveDemoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-semibold text-green-600 hover:underline flex items-center gap-1 bg-green-50 px-3 py-1.5 rounded-full"
                              >
                                <ExternalLink className="h-3 w-3" /> Live Demo <ArrowUpRight className="h-2.5 w-2.5" />
                              </a>
                            )}
                            {sub.figmaLink && (
                              <a
                                href={sub.figmaLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-semibold text-pink-600 hover:underline flex items-center gap-1 bg-pink-50 px-3 py-1.5 rounded-full"
                              >
                                <FileText className="h-3 w-3" /> Figma Link <ArrowUpRight className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>

                          {/* Uploaded Files Section */}
                          {sub.files && sub.files.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-xs font-semibold text-muted-foreground">Deliverable Files ({sub.files.length})</span>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {sub.files.map((file: any) => {
                                  const isImg = ["png", "jpg", "jpeg", "svg", "gif", "webp"].some(ext => file.fileType.toLowerCase().includes(ext));
                                  return (
                                    <div key={file.id} className="flex items-center justify-between p-2.5 rounded-xl border bg-secondary/10">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <File className="h-4 w-4 text-muted-foreground/60 flex-shrink-0" />
                                        <div className="min-w-0">
                                          <p className="text-xs font-medium text-foreground truncate">{file.filename}</p>
                                          <p className="text-[10px] text-muted-foreground">{(file.fileSize / 1024).toFixed(1)} KB</p>
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        {(isImg || file.fileType.toLowerCase().includes("pdf")) && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 text-[10px] rounded-full text-blue-600 hover:bg-blue-50"
                                            onClick={() => setPreviewFile({ name: file.filename, url: file.fileUrl, type: file.fileType })}
                                          >
                                            Preview
                                          </Button>
                                        )}
                                        <a
                                          href={file.fileUrl}
                                          download={file.filename}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[10px] bg-secondary hover:bg-secondary/80 font-medium px-2 py-1 rounded-full flex items-center gap-1"
                                        >
                                          Download
                                        </a>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Client review actions */}
                          {isClient && sub.status === "submitted" && (
                            <div className="flex gap-2.5 pt-3 border-t">
                              <Button
                                size="sm"
                                className="rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold text-xs gap-1"
                                onClick={() => {
                                  setReviewSubmissionId(sub.id);
                                  setReviewAction("approve");
                                  setReviewRating(5);
                                  setShowReviewModal(true);
                                }}
                              >
                                <CheckCircle className="h-3.5 w-3.5" /> Approve & Release Payment
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full text-xs font-semibold gap-1 border-orange-200 text-orange-700 hover:bg-orange-50"
                                onClick={() => {
                                  setReviewSubmissionId(sub.id);
                                  setReviewAction("revision");
                                  setShowReviewModal(true);
                                }}
                              >
                                <RefreshCw className="h-3.5 w-3.5" /> Request Revision
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full text-xs font-semibold gap-1 border-red-250 text-red-700 hover:bg-red-55"
                                onClick={() => {
                                  setReviewSubmissionId(sub.id);
                                  setReviewAction("reject");
                                  setShowReviewModal(true);
                                }}
                              >
                                <XCircle className="h-3.5 w-3.5" /> Reject Submission
                              </Button>
                            </div>
                          )}

                          {/* Comments Thread */}
                          <div className="space-y-3 pt-3 border-t">
                            <h5 className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                              <MessageSquare className="h-3.5 w-3.5" /> Comments & Reviews ({sub.comments?.length || 0})
                            </h5>
                            
                            {sub.comments && sub.comments.length > 0 && (
                              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {sub.comments.map((comm: any) => {
                                  const isUserComm = comm.userId === user?.id;
                                  return (
                                    <div key={comm.id} className={`p-2 rounded-lg text-xs ${isUserComm ? "bg-primary/5 border border-primary/10 ml-6" : "bg-secondary/40 mr-6"}`}>
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="font-semibold text-[10px] text-muted-foreground">
                                          {comm.userId === project.clientId ? "Client Reviewer" : "Freelancer"}
                                        </span>
                                        {comm.rating && (
                                          <div className="flex gap-0.5 text-yellow-500">
                                            {Array.from({ length: comm.rating }).map((_, i) => (
                                              <Star key={i} className="h-2.5 w-2.5 fill-current" />
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <p className="text-foreground leading-relaxed">{comm.comment}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="Write comments or ask questions about this version..."
                                className="h-8 text-xs"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && commentText.trim()) {
                                    postComment.mutate({ submissionId: sub.id, body: { comment: commentText.trim() } });
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                className="h-8 text-[10px] rounded-full px-3"
                                disabled={!commentText.trim() || postComment.isPending}
                                onClick={() => postComment.mutate({ submissionId: sub.id, body: { comment: commentText.trim() } })}
                              >
                                Send
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
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
                  {project.status !== "completed" && project.status !== "cancelled" && project.status !== "disputed" && project.status !== "accepted" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full mt-2 rounded-full text-xs gap-2"
                      onClick={() => {
                        setDisputeReason("");
                        setDisputeDesc("");
                        setShowDisputeModal(true);
                      }}
                    >
                      <AlertCircle className="h-3.5 w-3.5" /> Raise Dispute
                    </Button>
                  )}
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

      {/* Dispute Modal */}
      <Dialog open={showDisputeModal} onOpenChange={setShowDisputeModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-650">
              <AlertCircle className="h-5 w-5" />
              Raise a Project Dispute
            </DialogTitle>
            <DialogDescription className="text-xs">
              Raise a dispute to freeze escrow funds. Our mediation team will review submissions and evidence from both sides to resolve the issue.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Dispute Reason *</label>
              <Input
                placeholder="e.g. Incomplete deliverables, Missed deadline"
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Detailed Description *</label>
              <Textarea
                placeholder="Explain the situation in detail. Provide dates, specific deliverables missed, or other details."
                className="min-h-28 text-sm"
                value={disputeDesc}
                onChange={(e) => setDisputeDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowDisputeModal(false)} disabled={raiseDispute.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={raiseDispute.isPending || !disputeReason.trim() || !disputeDesc.trim()}
              onClick={() => {
                raiseDispute.mutate({ reason: disputeReason.trim(), description: disputeDesc.trim() });
              }}
            >
              {raiseDispute.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Initiate Dispute Mediation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Milestone Submission Modal */}
      <Dialog open={showSubmitModal} onOpenChange={setShowSubmitModal}>
        <DialogContent className="sm:max-w-[500px] overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <UploadCloud className="h-5 w-5" />
              Submit Milestone Deliverables
            </DialogTitle>
            <DialogDescription className="text-xs">
              Upload files and provide repository/demo links to submit your milestone work. TrustFirst+ smart escrow will lock and notify the client for approval.
            </DialogDescription>
          </DialogHeader>

          {isUploading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="text-center w-full max-w-[280px] space-y-2">
                <p className="text-sm font-semibold text-foreground">Uploading deliverables...</p>
                <Progress value={uploadProgress} className="h-2 rounded-full" />
                <p className="text-[10px] text-muted-foreground">Running security scans & verifying integrity hash</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3.5 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground">Submission Title *</label>
                  <Input
                    placeholder="e.g. Completed Auth Module"
                    value={submissionTitle}
                    onChange={(e) => setSubmissionTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground">Version Tag</label>
                  <Input
                    placeholder="e.g. 1.0.0"
                    value={submissionVersion}
                    onChange={(e) => setSubmissionVersion(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground">Technologies Used</label>
                  <Input
                    placeholder="React, Express, TailwindCSS"
                    value={submissionTech}
                    onChange={(e) => setSubmissionTech(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground">Hours Spent</label>
                  <Input
                    type="number"
                    value={submissionTime}
                    onChange={(e) => setSubmissionTime(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Work Summary / Description *</label>
                <Textarea
                  placeholder="Summary of deliverables completed for this milestone..."
                  className="min-h-16 text-sm"
                  value={submissionWorkSummary}
                  onChange={(e) => setSubmissionWorkSummary(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Additional Notes</label>
                <Textarea
                  placeholder="Completion notes, credentials, or review guidelines..."
                  className="min-h-12 text-sm"
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground">GitHub Repo URL</label>
                  <Input
                    placeholder="https://github.com/..."
                    value={githubRepo}
                    onChange={(e) => setGithubRepo(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground">Live Demo URL</label>
                  <Input
                    placeholder="https://my-demo.vercel.app"
                    value={liveDemoUrl}
                    onChange={(e) => setLiveDemoUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Figma Link</label>
                <Input
                  placeholder="https://figma.com/file/..."
                  value={figmaLink}
                  onChange={(e) => setFigmaLink(e.target.value)}
                />
              </div>

              {/* Upload Drop Zone */}
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Attach Deliverable Files *</label>
                <div
                  className="border-2 border-dashed border-primary/20 bg-primary/[0.01] hover:bg-primary/[0.02] transition-colors rounded-xl p-4 text-center cursor-pointer relative"
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.multiple = true;
                    input.onchange = (e: any) => {
                      const files = Array.from(e.target.files as FileList);
                      files.forEach((f) => {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const base64Url = event.target?.result as string;
                          setAttachedFiles(prev => [...prev, {
                            name: f.name,
                            type: f.name.split(".").pop() || "unknown",
                            size: f.size,
                            url: base64Url,
                          }]);
                        };
                        reader.readAsDataURL(f);
                      });
                    };
                    input.click();
                  }}
                >
                  <UploadCloud className="h-6 w-6 text-primary/60 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-foreground">Drag & drop files or click to upload</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">HTML, JS, TS, React, Node, Python, PDF, ZIP (Max 50MB)</p>
                </div>
              </div>

              {/* Attached file cards */}
              {attachedFiles.length > 0 && (
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {attachedFiles.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-2 border rounded-lg bg-secondary/20">
                      <div className="flex items-center gap-2 min-w-0">
                        <File className="h-3.5 w-3.5 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium text-foreground truncate">{file.name}</p>
                          <p className="text-[9px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-500 hover:bg-red-50 hover:text-red-650"
                        onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <DialogFooter className="pt-3 border-t">
                <Button variant="ghost" size="sm" onClick={() => setShowSubmitModal(false)} disabled={submitMilestone.isPending}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={submitMilestone.isPending || !submissionTitle.trim() || !submissionWorkSummary.trim() || attachedFiles.length === 0}
                  onClick={handleUploadSubmit}
                >
                  Submit Deliverables
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Client Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary capitalize">
              {reviewAction === "approve" ? <CheckCircle className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5" />}
              {reviewAction === "approve" ? "Approve Deliverables" : reviewAction === "revision" ? "Request Revision" : "Reject Submission"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {reviewAction === "approve"
                ? "Approving will automatically trigger Fintrust+ smart escrow to release milestone payment and transfer funds to the freelancer's wallet."
                : "Provide feedback explaining requested changes or reasons for reject."
              }
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 text-xs">
            {reviewAction === "approve" && (
              <div className="space-y-2">
                <label className="font-semibold text-muted-foreground">Rating</label>
                <div className="flex gap-1.5 text-yellow-500">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <Star
                      key={val}
                      className={`h-6 w-6 cursor-pointer ${val <= reviewRating ? "fill-current" : ""}`}
                      onClick={() => setReviewRating(val)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Feedback / Notes *</label>
              <Textarea
                placeholder={reviewAction === "approve" ? "Leave feedback about the deliverables (optional)..." : "Specify changes needed..."}
                className="min-h-24 text-sm"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowReviewModal(false)} disabled={submitReview.isPending}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant={reviewAction === "approve" ? "default" : "destructive"}
              disabled={submitReview.isPending || (reviewAction !== "approve" && !reviewComment.trim())}
              onClick={() => {
                if (reviewSubmissionId) {
                  submitReview.mutate({
                    submissionId: reviewSubmissionId,
                    action: reviewAction!,
                    body: {
                      comment: reviewComment.trim(),
                      rating: reviewAction === "approve" ? reviewRating : undefined,
                    }
                  });
                }
              }}
            >
              {submitReview.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              {reviewAction === "approve" ? "Confirm Approval" : reviewAction === "revision" ? "Send Revision Request" : "Reject Deliverables"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Preview Modal */}
      <Dialog open={previewFile !== null} onOpenChange={(open) => { if (!open) setPreviewFile(null); }}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm truncate">{previewFile?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-2 flex items-center justify-center bg-secondary/10 rounded-xl overflow-hidden min-h-[350px]">
            {previewFile?.type.toLowerCase().includes("pdf") ? (
              <div className="text-center space-y-3 p-6">
                <FileText className="h-16 w-16 text-muted-foreground/60 mx-auto" />
                <p className="text-sm font-semibold">PDF Document Preview</p>
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-xs bg-primary text-white font-semibold px-4 py-2 rounded-full hover:bg-primary/95"
                >
                  Open PDF in New Tab
                </a>
              </div>
            ) : (
              <img
                src={previewFile?.url}
                alt={previewFile?.name}
                className="max-w-full max-h-[500px] object-contain rounded-lg"
              />
            )}
          </div>
          <DialogFooter>
            <Button size="sm" variant="ghost" onClick={() => setPreviewFile(null)}>Close Preview</Button>
            <a
              href={previewFile?.url}
              download={previewFile?.name}
              target="_blank"
              rel="noreferrer"
              className="text-xs bg-primary text-white font-semibold px-3 py-2 rounded-full flex items-center gap-1 hover:bg-primary/95"
            >
              Download File
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
