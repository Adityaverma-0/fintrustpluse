import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMyProposals, useJobProposals } from "@/hooks/use-proposals";
import { Star, Clock, DollarSign, Briefcase, MapPin, CheckCircle, Shield, Users, Loader2, Plus, Trash2, ArrowUp, ArrowDown, Sparkles, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function JobDetail() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const { submitProposal } = useMyProposals();
  const jobId = parseInt(params.id ?? "0");
  const { proposals = [], acceptProposal, rejectProposal } = useJobProposals(jobId);

  const { data: job, isLoading } = useQuery<any>({
    queryKey: ["job", jobId],
    queryFn: () => api.get<any>(`/jobs/${jobId}`),
    enabled: !isNaN(jobId) && jobId > 0,
    retry: false,
  });

  const [showApply, setShowApply] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [bid, setBid] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Milestone Builder states
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("template1");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [customTemplateName, setCustomTemplateName] = useState("");
  const [milestones, setMilestones] = useState<any[]>([]);

  // Fetch platform configurations for current rates
  const { data: config } = useQuery<any>({
    queryKey: ["platform-config"],
    queryFn: () => api.get<any>("/platform-config"),
    enabled: isBuilderOpen,
  });

  const commissionRate = config ? Number(config.platformCommissionRate) : 10;

  // Load client saved templates
  const { data: savedTemplates = [], refetch: refetchTemplates } = useQuery<any[]>({
    queryKey: ["milestone-templates"],
    queryFn: () => api.get<any[]>("/milestone-templates"),
    enabled: isBuilderOpen,
  });

  // Automatically adjust calculations and layout when template selection changes
  useEffect(() => {
    if (!selectedProposal) return;
    const bidAmount = Number(selectedProposal.bidAmount);
    const expectedSum = 100 - commissionRate;

    if (selectedTemplate.startsWith("saved_")) {
      const savedId = parseInt(selectedTemplate.replace("saved_", ""));
      const found = savedTemplates.find(t => t.id === savedId);
      if (found && Array.isArray(found.structure)) {
        setMilestones(found.structure.map((m: any) => ({
          title: m.title,
          description: m.description || "",
          percentage: Number(m.percentage),
          deliverables: m.deliverables || "",
          dueDate: m.dueDate || "",
        })));
      }
      return;
    }

    let structures: any[] = [];
    if (selectedTemplate === "template1") {
      const share = expectedSum / 3;
      structures = [
        { title: "Milestone 1 - Planning & Setup", percentage: Number(share.toFixed(2)) },
        { title: "Milestone 2 - Core Implementation", percentage: Number(share.toFixed(2)) },
        { title: "Milestone 3 - Testing & Handover", percentage: Number((expectedSum - 2 * Number(share.toFixed(2))).toFixed(2)) },
      ];
    } else if (selectedTemplate === "template2") {
      const p1 = expectedSum * (25 / 90);
      const p2 = expectedSum * (25 / 90);
      const p3 = expectedSum * (50 / 90);
      structures = [
        { title: "Milestone 1 - Initial Deliverables", percentage: Number(p1.toFixed(2)) },
        { title: "Milestone 2 - Secondary Phase", percentage: Number(p2.toFixed(2)) },
        { title: "Milestone 3 - Final Release", percentage: Number((expectedSum - Number(p1.toFixed(2)) - Number(p2.toFixed(2))).toFixed(2)) },
      ];
    } else if (selectedTemplate === "template3") {
      const share = expectedSum / 2;
      structures = [
        { title: "Milestone 1 - First Half Development", percentage: Number(share.toFixed(2)) },
        { title: "Milestone 2 - Final Deployment", percentage: Number((expectedSum - Number(share.toFixed(2))).toFixed(2)) },
      ];
    } else if (selectedTemplate === "template4") {
      const p1 = expectedSum * (20 / 90);
      const p2 = expectedSum * (40 / 90);
      const p3 = expectedSum * (40 / 90);
      structures = [
        { title: "Milestone 1 - Setup & Mockups", percentage: Number(p1.toFixed(2)) },
        { title: "Milestone 2 - Alpha Release", percentage: Number(p2.toFixed(2)) },
        { title: "Milestone 3 - Beta & Completion", percentage: Number((expectedSum - Number(p1.toFixed(2)) - Number(p2.toFixed(2))).toFixed(2)) },
      ];
    } else if (selectedTemplate === "template5") {
      const p1 = expectedSum * (10 / 90);
      const p2 = expectedSum * (20 / 90);
      const p3 = expectedSum * (30 / 90);
      const p4 = expectedSum * (40 / 90);
      structures = [
        { title: "Milestone 1 - Phase 1", percentage: Number(p1.toFixed(2)) },
        { title: "Milestone 2 - Phase 2", percentage: Number(p2.toFixed(2)) },
        { title: "Milestone 3 - Phase 3", percentage: Number(p3.toFixed(2)) },
        { title: "Milestone 4 - Phase 4 Release", percentage: Number((expectedSum - Number(p1.toFixed(2)) - Number(p2.toFixed(2)) - Number(p3.toFixed(2))).toFixed(2)) },
      ];
    } else if (selectedTemplate === "custom") {
      structures = [
        { title: "Milestone 1", percentage: expectedSum },
      ];
    }

    setMilestones(structures.map(s => ({
      title: s.title,
      description: "",
      percentage: s.percentage,
      deliverables: "Completion of all checklist requirements.",
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    })));
  }, [selectedTemplate, selectedProposal, commissionRate, savedTemplates]);

  const saveTemplateMutation = useMutation({
    mutationFn: (body: any) => api.post("/milestone-templates", body),
    onSuccess: () => {
      refetchTemplates();
      toast({ title: "Template Saved!", description: "Your custom structure was stored for future project reuse." });
    }
  });

  const handleApply = async () => {
    if (!user) { toast({ title: "Please log in first", variant: "destructive" }); return; }
    if (user.role !== "freelancer") { toast({ title: "Only freelancers can apply to jobs", variant: "destructive" }); return; }
    if (!coverLetter.trim() || !bid || !deliveryDays) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await submitProposal.mutateAsync({
        jobId,
        coverLetter: coverLetter.trim(),
        bidAmount: parseFloat(bid),
        deliveryDays: parseInt(deliveryDays),
      });
      toast({ title: "Proposal submitted!", description: "The client will review your proposal shortly." });
      setShowApply(false);
      setCoverLetter("");
      setBid("");
      setDeliveryDays("");
    } catch (err: any) {
      toast({ title: "Failed to submit", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold mb-2">Job not found</h2>
          <p className="text-muted-foreground mb-4">This job may have been removed or doesn't exist.</p>
          <Link href="/jobs"><Button className="rounded-full bg-primary hover:bg-primary/90">Browse Jobs</Button></Link>
        </div>
      </div>
    );
  }

  const skills: string[] = Array.isArray(job.skills) ? job.skills : (job.skills ? String(job.skills).split(",").map((s: string) => s.trim()) : []);
  const clientInitials = (job.clientName ?? "C").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-5">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h1 className="text-2xl font-bold mb-2">{job.title}</h1>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <Badge variant="outline" className="capitalize">{job.budgetType}</Badge>
                        {job.budget && <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />${Number(job.budget).toLocaleString()}</span>}
                        {job.duration && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{job.duration}</span>}
                        {job.experienceLevel && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{job.experienceLevel}</span>}
                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{job.proposalCount ?? 0} proposals</span>
                        <span>{timeAgo(job.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {skills.map((s: string) => (
                        <Badge key={s} variant="secondary">{s}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="prose prose-sm max-w-none text-foreground">
                    {job.description.split("\n\n").map((para: string, i: number) => (
                      <p key={i} className="mb-3 text-sm leading-relaxed whitespace-pre-line">{para}</p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {user?.role === "client" && job?.clientId === user?.id && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 mt-6">
                  <Users className="h-5 w-5 text-primary" />
                  Proposals Received ({proposals.length})
                </h2>
                {proposals.length === 0 ? (
                  <Card>
                    <CardContent className="p-10 text-center text-muted-foreground">
                      No proposals submitted for this job yet.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {proposals.map((p: any) => (
                      <Card key={p.id} className="overflow-hidden hover:border-primary/30 transition-all">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                                  {p.freelancer?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() ?? "F"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-semibold text-base">{p.freelancer?.name}</h4>
                                <p className="text-xs text-muted-foreground">{p.freelancer?.title ?? "Freelancer"}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-sm">
                              <Badge className="bg-primary/10 text-primary border-0">Trust {p.freelancer?.trustScore ?? 95}</Badge>
                              <Badge variant="outline">Bid: ${Number(p.bidAmount).toLocaleString()}</Badge>
                              <Badge variant="secondary">{p.deliveryDays} days</Badge>
                              <Badge variant="outline" className="capitalize">{p.status}</Badge>
                            </div>
                          </div>

                          <div className="mt-4 p-3 bg-secondary/35 rounded-xl text-sm leading-relaxed text-muted-foreground whitespace-pre-line border border-secondary">
                            {p.coverLetter}
                          </div>

                          {p.status === "pending" && (
                            <div className="mt-4 flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full text-xs font-medium border-red-200 text-red-700 hover:bg-red-50"
                                disabled={rejectProposal.isPending || acceptProposal.isPending}
                                onClick={() => {
                                  rejectProposal.mutate(p.id, {
                                    onSuccess: () => {
                                      toast({ title: "Proposal declined", description: "You have declined this proposal." });
                                    }
                                  });
                                }}
                              >
                                Decline
                              </Button>
                              <Button
                                size="sm"
                                className="rounded-full text-xs font-semibold bg-green-600 hover:bg-green-700 text-white"
                                disabled={acceptProposal.isPending || rejectProposal.isPending}
                                onClick={() => {
                                  setSelectedProposal(p);
                                  setSelectedTemplate("template1");
                                  setIsBuilderOpen(true);
                                }}
                              >
                                Accept Quote & Start Project
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {user?.role === "freelancer" && (
              !showApply ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                    <CardContent className="p-6 flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <h3 className="font-semibold">Interested in this job?</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">Submit your proposal and stand out from the competition</p>
                      </div>
                      <Button onClick={() => setShowApply(true)} className="rounded-full bg-primary hover:bg-primary/90 px-6">
                        Apply Now
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card>
                    <CardContent className="p-6 space-y-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Submit a Proposal</h3>
                        <button onClick={() => setShowApply(false)} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            {job.budgetType === "fixed" ? "Your Bid ($)" : "Hourly Rate ($/hr)"} *
                          </label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              min="1"
                              placeholder={job.budgetType === "fixed" ? String(job.budget ?? "0") : "80"}
                              value={bid}
                              onChange={e => setBid(e.target.value)}
                              className="h-11 pl-9"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Delivery Days *</label>
                          <Input
                            type="number"
                            min="1"
                            placeholder="e.g. 14"
                            value={deliveryDays}
                            onChange={e => setDeliveryDays(e.target.value)}
                            className="h-11"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Cover Letter *</label>
                        <Textarea
                          placeholder="Introduce yourself and explain why you're the best fit for this job. Mention relevant experience and how you'd approach this project..."
                          value={coverLetter}
                          onChange={e => setCoverLetter(e.target.value)}
                          className="min-h-40 resize-none"
                          minLength={20}
                        />
                        <p className="text-xs text-muted-foreground">{coverLetter.length}/5000 characters (min 20)</p>
                      </div>

                      <div className="flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-xl p-3">
                        <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">Your payment is protected by TrustFirst+ Smart Escrow. Funds are held securely until you deliver.</p>
                      </div>

                      <Button
                        onClick={handleApply}
                        className="w-full rounded-full bg-primary hover:bg-primary/90 h-11"
                        disabled={submitting || !bid || !coverLetter || !deliveryDays}
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Submit Proposal
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            )}

            {!user && (
              <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="p-6 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="font-semibold">Want to apply?</h3>
                    <p className="text-sm text-muted-foreground">Create a freelancer account to submit proposals</p>
                  </div>
                  <Link href="/signup/freelancer">
                    <Button className="rounded-full bg-primary hover:bg-primary/90 px-6">Get Started Free</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">About the Client</h3>
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">{clientInitials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{job.clientName ?? "Client"}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-green-600" /> Verified
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  {[
                    { label: "Category", value: job.category },
                    { label: "Budget", value: job.budget ? `$${Number(job.budget).toLocaleString()}` : "Not specified" },
                    { label: "Duration", value: job.duration ?? "Not specified" },
                    { label: "Experience", value: job.experienceLevel ?? "Any level" },
                    { label: "Payment", value: <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-3.5 w-3.5" /> Verified</span> },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between items-center">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-medium text-right">{row.value}</span>
                    </div>
                  ))}
                </div>

                {user?.role === "freelancer" && (
                  <div className="mt-5 pt-4 border-t space-y-2">
                    <Button className="w-full rounded-full bg-primary hover:bg-primary/90 h-10" onClick={() => setShowApply(true)}>
                      Apply for This Job
                    </Button>
                  </div>
                )}

                <div className="mt-4 text-center">
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Shield className="h-3 w-3 text-primary" />
                    Protected by Smart Escrow
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Milestone Builder & Platform Commission Config Dialog */}
      <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-blue-600 animate-pulse" />
              Configure Escrow Milestones
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-sm">
              Customise the payment release checkpoints for this contract. The freelancer will receive funds as each milestone is completed and approved.
            </DialogDescription>
          </DialogHeader>

          {selectedProposal && (
            <div className="space-y-6 my-4">
              {/* Project Stats Summary Banner */}
              <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Project Budget</span>
                  <span className="text-lg font-black text-slate-800">${Number(selectedProposal.bidAmount).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Platform Commission ({commissionRate}%)</span>
                  <span className="text-lg font-black text-blue-600">${(Number(selectedProposal.bidAmount) * commissionRate / 100).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Freelancer Escrow Pool</span>
                  <span className="text-lg font-black text-green-600">${(Number(selectedProposal.bidAmount) * (100 - commissionRate) / 100).toFixed(2)}</span>
                </div>
              </div>

              {/* Template Selector */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Payment Template</label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger className="rounded-xl border-slate-200">
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="template1">3 Milestones: 30% / 30% / 30%</SelectItem>
                      <SelectItem value="template2">3 Milestones: 25% / 25% / 50%</SelectItem>
                      <SelectItem value="template3">2 Milestones: 50% / 50%</SelectItem>
                      <SelectItem value="template4">3 Milestones: 20% / 40% / 40%</SelectItem>
                      <SelectItem value="template5">4 Milestones: 10% / 20% / 30% / 40%</SelectItem>
                      <SelectItem value="custom">Custom Milestone Split</SelectItem>
                      {savedTemplates.map((t) => (
                        <SelectItem key={t.id} value={`saved_${t.id}`}>Saved: {t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTemplate === "custom" && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 text-transparent select-none block">Action</label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full rounded-xl border-dashed border-blue-300 text-blue-600 hover:bg-blue-50"
                      onClick={() => {
                        setMilestones(prev => [
                          ...prev,
                          {
                            title: `Milestone ${prev.length + 1}`,
                            description: "",
                            percentage: 0,
                            deliverables: "",
                            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                          }
                        ]);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Custom Milestone
                    </Button>
                  </div>
                )}
              </div>

              {/* Milestones Cards List */}
              <div className="space-y-4 max-h-[35vh] overflow-y-auto pr-1">
                {milestones.map((m, idx) => {
                  const amt = (Number(selectedProposal.bidAmount) * (Number(m.percentage) || 0)) / 100;
                  return (
                    <Card key={idx} className="border-slate-200 shadow-sm relative group overflow-hidden">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs font-bold text-slate-400 uppercase">Milestone #{idx + 1}</span>
                          <div className="flex items-center gap-1">
                            {/* Reordering Controls */}
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-slate-400 hover:text-slate-700"
                              disabled={idx === 0}
                              onClick={() => {
                                const list = [...milestones];
                                const tmp = list[idx];
                                list[idx] = list[idx - 1];
                                list[idx - 1] = tmp;
                                setMilestones(list);
                                setSelectedTemplate("custom");
                              }}
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-slate-400 hover:text-slate-700"
                              disabled={idx === milestones.length - 1}
                              onClick={() => {
                                const list = [...milestones];
                                const tmp = list[idx];
                                list[idx] = list[idx + 1];
                                list[idx + 1] = tmp;
                                setMilestones(list);
                                setSelectedTemplate("custom");
                              }}
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                            {/* Delete Control */}
                            {milestones.length > 1 && (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setMilestones(prev => prev.filter((_, i) => i !== idx));
                                  setSelectedTemplate("custom");
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Title and Percentage Fields */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2 space-y-1">
                            <label className="text-xs font-semibold text-slate-500">Milestone Title</label>
                            <Input
                              value={m.title}
                              placeholder="e.g. Wireframing & Prototyping"
                              className="h-9 rounded-lg"
                              onChange={(e) => {
                                const list = [...milestones];
                                list[idx].title = e.target.value;
                                setMilestones(list);
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500">Weight (%)</label>
                            <div className="relative">
                              <Input
                                type="number"
                                value={m.percentage || ""}
                                placeholder="30"
                                className="h-9 rounded-lg pr-6"
                                onChange={(e) => {
                                  const list = [...milestones];
                                  list[idx].percentage = Number(e.target.value) || 0;
                                  setMilestones(list);
                                  setSelectedTemplate("custom");
                                }}
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">%</span>
                            </div>
                          </div>
                        </div>

                        {/* Due Date & Deliverables Fields */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500">Due Date</label>
                            <Input
                              type="date"
                              value={m.dueDate}
                              className="h-9 rounded-lg"
                              onChange={(e) => {
                                const list = [...milestones];
                                list[idx].dueDate = e.target.value;
                                setMilestones(list);
                              }}
                            />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <label className="text-xs font-semibold text-slate-500">Deliverables</label>
                            <Input
                              value={m.deliverables}
                              placeholder="Figma links, PDF specs, codebase setup..."
                              className="h-9 rounded-lg"
                              onChange={(e) => {
                                const list = [...milestones];
                                list[idx].deliverables = e.target.value;
                                setMilestones(list);
                              }}
                            />
                          </div>
                        </div>

                        {/* Calculations preview row */}
                        <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2 text-slate-500">
                          <span>Milestone Budget Allocation:</span>
                          <strong className="text-slate-800">${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Validation Feedback & AI Advisor */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Milestone Verification & AI suggestions</span>
                
                {/* Audit stats row */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl text-xs border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Target Percentage:</span>
                    <strong className="text-slate-800">{(100 - commissionRate)}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Allocated Sum:</span>
                    <strong className={Math.abs(milestones.reduce((s, m) => s + (Number(m.percentage) || 0), 0) - (100 - commissionRate)) < 0.01 ? "text-green-600" : "text-red-500"}>
                      {milestones.reduce((s, m) => s + (Number(m.percentage) || 0), 0).toFixed(2)}%
                    </strong>
                  </div>
                </div>

                {/* Audit errors panel */}
                {(Math.abs(milestones.reduce((s, m) => s + (Number(m.percentage) || 0), 0) - (100 - commissionRate)) > 0.01 ||
                  milestones.some(m => !m.deliverables || m.deliverables.trim().length === 0) ||
                  milestones.some(m => (Number(m.percentage) || 0) <= 0) ||
                  milestones.map(m => m.title.trim()).some((val, i, arr) => arr.indexOf(val) !== i)
                ) && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl space-y-1">
                    {Math.abs(milestones.reduce((s, m) => s + (Number(m.percentage) || 0), 0) - (100 - commissionRate)) > 0.01 && (
                      <p>• Total milestone percentage weight must equal exactly {(100 - commissionRate)}%.</p>
                    )}
                    {milestones.some(m => !m.deliverables || m.deliverables.trim().length === 0) && (
                      <p>• Every milestone must declare deliverables.</p>
                    )}
                    {milestones.some(m => (Number(m.percentage) || 0) <= 0) && (
                      <p>• Milestone percentage allocations must be greater than 0%.</p>
                    )}
                    {milestones.map(m => m.title.trim()).some((val, i, arr) => arr.indexOf(val) !== i) && (
                      <p>• Milestone titles must be unique (no duplicates).</p>
                    )}
                  </div>
                )}

                {/* AI Advice list */}
                {milestones.some(m => Number(m.percentage) > 70) && (
                  <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl flex gap-2 items-start">
                    <Sparkles className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-blue-900 font-bold mb-0.5">AI Risk Advisor Suggestions:</strong>
                      <p>Top-heavy milestone structure detected. Milestone is allocating over 70% of the total budget. We suggest splitting the phase to balance financial release stakes.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Save template builder options */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="save_template"
                    checked={saveAsTemplate}
                    onChange={(e) => setSaveAsTemplate(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="save_template" className="text-sm font-semibold text-slate-700 select-none cursor-pointer">
                    Save this configuration as a milestone template for future projects
                  </label>
                </div>
                {saveAsTemplate && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Template Name (e.g. Standard 3-Phase Web Dev)"
                      value={customTemplateName}
                      className="h-10 rounded-xl"
                      onChange={(e) => setCustomTemplateName(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl border-slate-200"
                      disabled={!customTemplateName.trim() || saveTemplateMutation.isPending}
                      onClick={() => {
                        saveTemplateMutation.mutate({
                          name: customTemplateName.trim(),
                          structure: milestones,
                        });
                      }}
                    >
                      {saveTemplateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-5"
              onClick={() => setIsBuilderOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold px-6"
              disabled={
                acceptProposal.isPending ||
                milestones.length === 0 ||
                Math.abs(milestones.reduce((s, m) => s + (Number(m.percentage) || 0), 0) - (100 - commissionRate)) > 0.01 ||
                milestones.some(m => !m.deliverables || m.deliverables.trim().length === 0) ||
                milestones.some(m => (Number(m.percentage) || 0) <= 0) ||
                milestones.map(m => m.title.trim()).some((val, i, arr) => arr.indexOf(val) !== i)
              }
              onClick={() => {
                if (!selectedProposal) return;
                acceptProposal.mutate({
                  id: selectedProposal.id,
                  body: {
                    commissionRate,
                    milestones: milestones,
                  }
                }, {
                  onSuccess: (res: any) => {
                    setIsBuilderOpen(false);
                    toast({ title: "Proposal accepted!", description: "Project spawned. Please proceed to fund the escrow." });
                    const targetProjId = res?.id || res?.projectId;
                    if (targetProjId) {
                      setLocation(`/projects/${targetProjId}`);
                    }
                  },
                  onError: (err: any) => {
                    toast({ title: "Failed to accept proposal", description: err.message, variant: "destructive" });
                  }
                });
              }}
            >
              {acceptProposal.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm & Start Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
