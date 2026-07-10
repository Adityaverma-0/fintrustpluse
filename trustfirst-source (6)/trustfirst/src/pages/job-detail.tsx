import { useState } from "react";
import { Link, useParams } from "wouter";
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
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMyProposals } from "@/hooks/use-proposals";
import { Star, Clock, DollarSign, Briefcase, MapPin, CheckCircle, Shield, Users, Loader2 } from "lucide-react";

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
  const { submitProposal } = useMyProposals();

  const jobId = parseInt(params.id ?? "0");

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
      <Footer />
    </div>
  );
}
