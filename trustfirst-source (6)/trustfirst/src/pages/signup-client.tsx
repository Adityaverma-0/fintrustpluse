import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, CheckCircle } from "lucide-react";

export default function SignupClient() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", title: "" });

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
          role: "client",
          title: form.title || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Registration failed");
      login(data.token, data.user);
      toast({ title: "Welcome to TrustFirst+!", description: "Your client account is ready. Start posting jobs!" });
      navigate("/dashboard/client");
    } catch (err: any) {
      toast({ title: "Signup failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-transparent to-transparent" />
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md">
       
        <Card className="shadow-xl border border-white/30 bg-white/10 backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/10">
          <CardHeader className="flex flex-col space-y-1.5 p-6 pb-4 justify-center items-center text-[#ffffff]">
            <div className="flex justify-center mb-8">
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

            <CardTitle className="font-semibold tracking-tight text-2xl">Create your Client Account</CardTitle>
            <CardDescription>Find top talent and hire with confidence.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0 text-[#ffffff] font-normal">
           

            <div className="mb-2">
              <h3 className="font-semibold text-xl">Your details</h3>
              <p className="text-[#878383] text-lg">Set up your hiring profile</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input placeholder="Jane Doe" value={form.name} onChange={e => update("name", e.target.value)} required className="h-11 bg-white/20 border-white/30 backdrop-blur-sm" />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" placeholder="you@company.com" value={form.email} onChange={e => update("email", e.target.value)} required className="h-11 bg-white/20 border-white/30 backdrop-blur-sm" />
              </div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input type="password" placeholder="Min. 6 characters" value={form.password} onChange={e => update("password", e.target.value)} required minLength={6} className="h-11 bg-white/20 border-white/30 backdrop-blur-sm" />
              </div>
              <div className="space-y-2">
                <Label>Your Title / Role</Label>
                <Input placeholder="e.g. CTO at Acme Corp" value={form.title} onChange={e => update("title", e.target.value)} className="h-11 bg-white/20 border-white/30 backdrop-blur-sm" />
              </div>
              <Button type="submit" className="w-full h-11 rounded-full bg-primary hover:bg-primary/90 font-semibold" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Client Account
              </Button>
            </form>

            <div className="flex items-center justify-center gap-2 mt-6 text-[#ffffff] text-base">
              <Shield className="h-3 w-3 text-primary" />
              Secured by TrustFirst+ Smart Escrow
            </div>
            <p className="text-center mt-4 text-[#ffffff] text-lg">
              Already have an account? <Link href="/login" className="hover:underline font-medium text-[#949494]">Log in</Link>
            </p>
           
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
