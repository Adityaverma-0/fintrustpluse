import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, CheckCircle } from "lucide-react";

const CATEGORIES = ["Development & IT", "Design & Creative", "Writing & Translation", "Finance & Accounting", "Marketing & Sales", "Engineering & Architecture", "Customer Service", "Legal"];

export default function SignupFreelancer() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", title: "", category: "", skills: "", hourlyRate: "" });

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: "freelancer",
          title: form.title || undefined,
          skills: form.skills || undefined,
          hourlyRate: parseFloat(form.hourlyRate) || undefined,
          category: form.category || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Registration failed");
      login(data.token, data.user);
      toast({ title: "Welcome to TrustFirst+!", description: "Your freelancer account is ready." });
      navigate("/dashboard/freelancer");
    } catch (err: any) {
      toast({ title: "Signup failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/40 via-transparent to-transparent" />
      <video
        autoPlay loop muted playsInline
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover", opacity: 0.70, zIndex: 0,
        }}
      >
        <source src="/signup-bg.mp4" type="video/mp4" />
      </video>
      {/* Vignette overlay */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: "radial-gradient(ellipse at center, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.55) 100%)",
      }} />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-lg">
        <Card className="shadow-xl border border-white/30 bg-white/10 backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/10">
          <CardHeader className="pb-4">
            <div className="flex justify-center mb-4">
              <Link href="/">
                <motion.img
                  src="/logo-nobg.png"
                  alt="TrustFirst+ Logo"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.18 }}
                  style={{ width: 180, height: 180, objectFit: "contain",
                    filter: "brightness(0) invert(1) drop-shadow(0 4px 16px rgba(0,0,0,0.35))" }}
                />
              </Link>
            </div>
            <CardTitle className="font-semibold tracking-tight text-center text-2xl text-[#9da399]">Create your Freelancer Account</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0 text-[#ffffff] text-base font-normal">
          
            <div className="mb-2">
              <h3 className="font-semibold">Your details</h3>
              <p className="text-sm text-muted-foreground">Set up your professional profile</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input placeholder="John Smith" value={form.name} onChange={e => update("name", e.target.value)} required className="h-11 bg-white/20 border-white/30 backdrop-blur-sm" />
                </div>
                <div className="space-y-2">
                  <Label>Hourly Rate ($)</Label>
                  <Input type="number" placeholder="75" value={form.hourlyRate} onChange={e => update("hourlyRate", e.target.value)} className="h-11 bg-white/20 border-white/30 backdrop-blur-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" placeholder="you@example.com" value={form.email} onChange={e => update("email", e.target.value)} required className="h-11 bg-white/20 border-white/30 backdrop-blur-sm" />
              </div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input type="password" placeholder="Min. 6 characters" value={form.password} onChange={e => update("password", e.target.value)} required minLength={6} className="h-11 bg-white/20 border-white/30 backdrop-blur-sm" />
              </div>
              <div className="space-y-2">
                <Label>Professional Title *</Label>
                <Input placeholder="e.g. Senior React Developer" value={form.title} onChange={e => update("title", e.target.value)} required className="h-11 bg-white/20 border-white/30 backdrop-blur-sm" />
              </div>
              <div className="space-y-2">
                <Label>Main Category</Label>
                <Select onValueChange={v => update("category", v)}>
                  <SelectTrigger className="h-11 bg-white/20 border-white/30 backdrop-blur-sm"><SelectValue placeholder="Select your main category" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Top Skills (comma-separated)</Label>
                <Input placeholder="React, Node.js, TypeScript" value={form.skills} onChange={e => update("skills", e.target.value)} className="h-11 bg-white/20 border-white/30 backdrop-blur-sm" />
              </div>
              <Button type="submit" className="w-full h-11 rounded-full bg-primary hover:bg-primary/90 font-semibold" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Freelancer Account
              </Button>
            </form>

            <div className="flex gap-2 mt-6 text-xs font-medium text-[#ffffff] flex-row justify-center items-center text-left border-t-[#946666] border-r-[#946666] border-b-[#946666] border-l-[#946666]">
              <Shield className="h-3 w-3 text-primary" />
              Secured by TrustFirst+ Smart Escrow
            </div>
            <p className="text-center text-sm mt-4 text-[#ffffff]">
              Already have an account? <Link href="/login" className="hover:underline font-medium text-[#b0b0b0]">Log in</Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
