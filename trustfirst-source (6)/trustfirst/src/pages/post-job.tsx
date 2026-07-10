import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { authHeaders } from "@/lib/auth-token";
import { Loader2, Plus, X, Briefcase, DollarSign, Clock, CheckCircle } from "lucide-react";

const CATEGORIES = ["Development & IT", "Design & Creative", "Writing & Translation", "Finance & Accounting", "Marketing & Sales", "Engineering & Architecture", "Customer Service", "Legal"];

const STEPS = ["Job Details", "Requirements", "Budget & Timeline", "Review & Post"];

export default function PostJob() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    budgetType: "fixed",
    budget: "",
    duration: "",
    experienceLevel: "expert",
    skills: [] as string[],
  });

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const addSkill = () => {
    if (skillInput.trim() && !form.skills.includes(skillInput.trim())) {
      update("skills", [...form.skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const removeSkill = (s: string) => update("skills", form.skills.filter(sk => sk !== s));

  const handleSubmit = async () => {
    if (!user) { toast({ title: "Please login first", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          category: form.category,
          budgetType: form.budgetType,
          budget: parseFloat(form.budget),
          skills: form.skills.join(","),
        }),
      });
      if (!res.ok) throw new Error("Failed to post job");
      toast({ title: "Job posted!", description: "Your job is now live and accepting proposals." });
      navigate("/dashboard/client");
    } catch (err: any) {
      toast({ title: "Failed to post job", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/20">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Post a Job</h1>
            <p className="text-muted-foreground">Find the perfect freelancer for your project</p>
          </div>

          {/* Progress */}
          <div className="flex items-center mb-8">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    i < step ? "bg-primary text-white" : i === step ? "bg-primary text-white ring-4 ring-primary/20" : "bg-secondary text-muted-foreground"
                  }`}>
                    {i < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className="text-xs mt-1 text-muted-foreground hidden md:block">{s}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${i < step ? "bg-primary" : "bg-secondary"}`} />
                )}
              </div>
            ))}
          </div>

          <Card className="shadow-sm">
            {step === 0 && (
              <CardContent className="p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Job Details</h2>
                  <p className="text-sm text-muted-foreground">Tell us about the job you need done</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title *</Label>
                  <Input id="title" placeholder="e.g. Build a React dashboard with AI features" value={form.title} onChange={e => update("title", e.target.value)} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Job Description *</Label>
                  <Textarea
                    id="desc"
                    placeholder="Describe what you need, what the deliverables are, and any specific requirements..."
                    value={form.description}
                    onChange={e => update("description", e.target.value)}
                    className="min-h-36 resize-none"
                  />
                  <p className="text-xs text-muted-foreground">{form.description.length}/5000 characters</p>
                </div>
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select onValueChange={v => update("category", v)}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            )}

            {step === 1 && (
              <CardContent className="p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Requirements</h2>
                  <p className="text-sm text-muted-foreground">What skills and experience do you need?</p>
                </div>
                <div className="space-y-2">
                  <Label>Required Skills</Label>
                  <div className="flex gap-2">
                    <Input placeholder="e.g. React" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(); }}} className="h-10" />
                    <Button type="button" onClick={addSkill} variant="outline" className="h-10 flex-shrink-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {form.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {form.skills.map(s => (
                        <Badge key={s} variant="secondary" className="flex items-center gap-1 pr-1">
                          {s}
                          <button onClick={() => removeSkill(s)} className="ml-1 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Experience Level</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[["entry", "Entry Level", "Simple tasks, lower budget"], ["intermediate", "Intermediate", "Some experience needed"], ["expert", "Expert", "Complex work, top quality"]].map(([v, l, d]) => (
                      <button key={v} type="button" onClick={() => update("experienceLevel", v)} className={`p-3 border rounded-xl text-left transition-all ${form.experienceLevel === v ? "border-primary bg-primary/5" : "hover:border-gray-300"}`}>
                        <div className="font-medium text-sm">{l}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{d}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}

            {step === 2 && (
              <CardContent className="p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Budget & Timeline</h2>
                  <p className="text-sm text-muted-foreground">How much are you willing to pay?</p>
                </div>
                <div className="space-y-2">
                  <Label>Payment Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[["fixed", DollarSign, "Fixed Price", "Pay a set amount for the whole project"], ["hourly", Clock, "Hourly Rate", "Pay by the hour based on time tracked"]].map(([v, Icon, l, d]) => (
                      <button key={v as string} type="button" onClick={() => update("budgetType", v)} className={`p-4 border rounded-xl text-left transition-all ${form.budgetType === v ? "border-primary bg-primary/5" : "hover:border-gray-300"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">{l as string}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{d as string}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{form.budgetType === "fixed" ? "Project Budget ($)" : "Hourly Rate Budget ($/hr)"}</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder={form.budgetType === "fixed" ? "5000" : "75"} value={form.budget} onChange={e => update("budget", e.target.value)} className="h-11 pl-9" type="number" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Project Duration</Label>
                  <Select onValueChange={v => update("duration", v)}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Select duration" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="less_than_1_month">Less than 1 month</SelectItem>
                      <SelectItem value="1_3_months">1–3 months</SelectItem>
                      <SelectItem value="3_6_months">3–6 months</SelectItem>
                      <SelectItem value="6_months_plus">6+ months (ongoing)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            )}

            {step === 3 && (
              <CardContent className="p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Review & Post</h2>
                  <p className="text-sm text-muted-foreground">Review your job before it goes live</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-5 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Job Title</p>
                    <p className="font-semibold">{form.title || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Category</p>
                    <p className="font-medium">{form.category || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {form.skills.map(s => <Badge key={s} variant="secondary">{s}</Badge>)}
                      {form.skills.length === 0 && <span className="text-sm text-muted-foreground">None specified</span>}
                    </div>
                  </div>
                  <div className="flex gap-8">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Budget</p>
                      <p className="font-semibold text-primary">{form.budget ? `$${form.budget}${form.budgetType === "hourly" ? "/hr" : ""}` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Duration</p>
                      <p className="font-medium">{form.duration?.replace(/_/g, " ") || "—"}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
                  <Briefcase className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-primary">Ready to post!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Your job will be visible to 850K+ freelancers. AI matching will suggest best-fit candidates within minutes.</p>
                  </div>
                </div>
              </CardContent>
            )}

            <div className="px-6 pb-6 flex justify-between">
              {step > 0 ? (
                <Button variant="outline" onClick={() => setStep(s => s - 1)} className="rounded-full">
                  Back
                </Button>
              ) : (
                <Link href="/dashboard/client">
                  <Button variant="outline" className="rounded-full">Cancel</Button>
                </Link>
              )}
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep(s => s + 1)} className="rounded-full bg-primary hover:bg-primary/90" disabled={step === 0 && (!form.title || !form.description || !form.category)}>
                  Continue
                </Button>
              ) : (
                <Button onClick={handleSubmit} className="rounded-full bg-primary hover:bg-primary/90" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Post Job
                </Button>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function Label({ htmlFor, children, className }: { htmlFor?: string; children: React.ReactNode; className?: string }) {
  return <label htmlFor={htmlFor} className={`text-sm font-medium ${className || ""}`}>{children}</label>;
}
