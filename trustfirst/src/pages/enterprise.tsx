import { motion } from "framer-motion";
import { Link } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Users, BarChart3, Lock, Globe, Headphones, CheckCircle, ArrowRight, Building2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const FEATURES = [
  {
    icon: Users,
    title: "Dedicated Talent Pool",
    desc: "Build a private vetted talent pool. Invite and manage preferred freelancers with exclusive access.",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    desc: "Full spend analytics, contractor performance dashboards, and compliance reporting for finance teams.",
  },
  {
    icon: Lock,
    title: "SSO & Security",
    desc: "Enterprise-grade SSO (SAML 2.0, OIDC), RBAC, audit logs, and SOC 2 Type II compliance.",
  },
  {
    icon: Shield,
    title: "Custom Escrow Terms",
    desc: "Flexible milestone structures, Net 30/60 payment terms, and custom contract templates.",
  },
  {
    icon: Globe,
    title: "Global Payroll",
    desc: "Pay contractors in 150+ countries. Automated tax compliance, W-9/W-8BEN collection, and 1099 filing.",
  },
  {
    icon: Headphones,
    title: "Dedicated Account Manager",
    desc: "A named account manager, onboarding specialist, and 24/7 priority support SLA.",
  },
];

const CLIENTS = [
  { name: "TechCorp", initials: "TC", sector: "SaaS" },
  { name: "BuildRight", initials: "BR", sector: "Construction Tech" },
  { name: "DataFlow", initials: "DF", sector: "Data & Analytics" },
  { name: "NovaMed", initials: "NM", sector: "Healthcare" },
  { name: "Apex Ventures", initials: "AV", sector: "Finance" },
  { name: "CreativeHub", initials: "CH", sector: "Media" },
];

const STATS = [
  { value: "500+", label: "Enterprise clients" },
  { value: "$2.4B+", label: "Payments processed" },
  { value: "150+", label: "Countries supported" },
  { value: "99.9%", label: "Platform uptime" },
];

export default function Enterprise() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", size: "", message: "" });

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    toast({ title: "Request received!", description: "Our enterprise team will contact you within 1 business day." });
    setForm({ name: "", email: "", company: "", size: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-24">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-block bg-white/10 text-white/80 text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-white/20">FinTrust+ Enterprise</span>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              The enterprise-grade<br />freelance platform
            </h1>
            <p className="text-xl text-white/70 mb-10 max-w-2xl mx-auto">
              Scale your external workforce with enterprise security, compliance, and the world's most trusted escrow infrastructure.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <a href="#contact">
                <Button size="lg" className="rounded-full bg-primary hover:bg-primary/90 px-8 h-12 font-semibold text-white">
                  Talk to sales <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <Link href="/why-trustfirst">
                <Button size="lg" variant="outline" className="rounded-full px-8 h-12 border-white/30 text-white hover:bg-white/10">
                  Why FinTrust+
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-12 border-b bg-secondary/30">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground mb-8">Trusted by leading companies worldwide</p>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            {CLIENTS.map(c => (
              <div key={c.name} className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{c.initials}</div>
                <span className="font-medium">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto text-center">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
                viewport={{ once: true }}
              >
                <div className="text-3xl font-bold text-primary mb-1">{s.value}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Everything enterprises need</h2>
            <p className="text-muted-foreground">Built for procurement, legal, and finance teams.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                viewport={{ once: true }}
                className="bg-card border rounded-2xl p-6"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-primary/5 border-t border-b">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="flex items-start gap-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex-shrink-0 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <blockquote className="text-xl font-medium mb-4">
                "FinTrust+ Enterprise transformed how we manage our global contractor base. We went from 3-week onboarding to 3 days, and our compliance team finally has the audit trail they need."
              </blockquote>
              <div className="text-sm font-semibold">David Park</div>
              <div className="text-sm text-muted-foreground">VP of Engineering, DataFlow Analytics</div>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="py-16 container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">Talk to our enterprise team</h2>
            <p className="text-muted-foreground">Tell us about your needs and we'll reach out within 1 business day.</p>
          </div>
          <div className="bg-card border rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Your name *</Label>
                  <Input placeholder="Jane Smith" value={form.name} onChange={e => update("name", e.target.value)} required className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label>Work email *</Label>
                  <Input type="email" placeholder="jane@company.com" value={form.email} onChange={e => update("email", e.target.value)} required className="h-11" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company *</Label>
                  <Input placeholder="Acme Corp" value={form.company} onChange={e => update("company", e.target.value)} required className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label>Company size</Label>
                  <Input placeholder="e.g. 500–1000 employees" value={form.size} onChange={e => update("size", e.target.value)} className="h-11" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>What are you looking to solve?</Label>
                <Textarea placeholder="Tell us about your contractor management challenges..." value={form.message} onChange={e => update("message", e.target.value)} rows={4} />
              </div>
              <Button type="submit" className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 font-semibold" disabled={loading}>
                {loading ? "Sending..." : <>Request a demo <ArrowRight className="ml-2 h-4 w-4" /></>}
              </Button>
            </form>
            <div className="flex items-center gap-6 mt-6 pt-6 border-t text-xs text-muted-foreground">
              {["SOC 2 Type II", "GDPR Compliant", "99.9% uptime SLA"].map(b => (
                <div key={b} className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-primary" />
                  {b}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
