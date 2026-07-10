import { motion } from "framer-motion";
import { Link } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Shield, Zap, Star, Lock, TrendingUp, Users, CheckCircle, ArrowRight } from "lucide-react";

const REASONS = [
  {
    icon: Shield,
    title: "Smart Escrow Protection",
    desc: "Every payment is held securely in escrow until milestones are approved. No more unpaid work or disappearing clients.",
    stat: "$0 lost to fraud",
  },
  {
    icon: Zap,
    title: "AI-Powered Matching",
    desc: "Our AI analyzes 50+ signals to match you with the right talent or jobs — not just keywords, but real fit.",
    stat: "3× faster hiring",
  },
  {
    icon: Star,
    title: "Verified Trust Scores",
    desc: "Every freelancer and client has a real TrustScore built from verified reviews, completion rates, and payment history.",
    stat: "99.2% satisfaction",
  },
  {
    icon: Lock,
    title: "Dispute Resolution",
    desc: "A dedicated team resolves any contract disputes fairly using evidence-based review within 5 business days.",
    stat: "97% resolved",
  },
  {
    icon: TrendingUp,
    title: "Transparent Fees",
    desc: "Freelancers keep 90% of their earnings. No surprise fees, no hidden charges. What you see is what you get.",
    stat: "90% to freelancers",
  },
  {
    icon: Users,
    title: "Real Human Support",
    desc: "24/7 live support from real humans who understand freelancing. Not chatbots, not ticket queues.",
    stat: "< 2 min response",
  },
];

const COMPARISONS = [
  { feature: "Platform fee (freelancer)", us: "10%", them: "20%" },
  { feature: "Escrow protection", us: "✓ Built-in", them: "✗ Add-on" },
  { feature: "AI job matching", us: "✓ Included", them: "✗ None" },
  { feature: "Dispute resolution", us: "✓ Free, 5 days", them: "✓ Paid, 30 days" },
  { feature: "Milestone tracking", us: "✓ Visual", them: "✓ Basic" },
  { feature: "Trust verification", us: "✓ Real-time", them: "✗ Manual" },
];

const STORIES = [
  {
    name: "James Okafor",
    role: "Full-Stack Developer",
    avatar: "JO",
    quote: "I switched from another platform and immediately noticed the difference. The escrow actually works — I got paid for every milestone, on time, every time. My earnings went up 40% in 6 months.",
    earnings: "$127K earned",
  },
  {
    name: "Sarah Chen",
    role: "Startup Founder",
    avatar: "SC",
    quote: "As a client, TrustFirst+ gave me confidence to hire internationally. The milestone system kept projects on track and the AI matched me with exactly the right developers.",
    hired: "14 projects completed",
  },
  {
    name: "Amara Diallo",
    role: "UX/UI Designer",
    avatar: "AD",
    quote: "The trust score system is a game changer. Clients can see my real track record and I can see theirs. No more guessing if a client will pay.",
    earnings: "$89K earned",
  },
];

export default function WhyTrustFirst() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="bg-gradient-to-br from-primary/5 via-background to-accent/10 py-20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-block bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-4">Why TrustFirst+</span>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Freelancing should feel safe.<br />Now it does.</h1>
            <p className="text-lg text-muted-foreground mb-8">
              We built TrustFirst+ because we were tired of unpaid invoices, disappearing clients, and platforms that take 20% of every dollar. There's a better way.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/signup">
                <Button className="rounded-full bg-primary hover:bg-primary/90 px-8 h-12 font-semibold">
                  Get started free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/freelancers">
                <Button variant="outline" className="rounded-full px-8 h-12">Browse talent</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">6 reasons 500K+ people chose TrustFirst+</h2>
          <p className="text-muted-foreground">Built by freelancers, for freelancers — and the clients who trust them.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {REASONS.map((r, i) => (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              viewport={{ once: true }}
              className="bg-card border rounded-2xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <r.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{r.title}</h3>
              <p className="text-muted-foreground text-sm mb-4">{r.desc}</p>
              <span className="text-primary font-bold text-sm">{r.stat}</span>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-secondary/50 py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">TrustFirst+ vs the rest</h2>
            <p className="text-muted-foreground">See why freelancers and clients are making the switch.</p>
          </div>
          <div className="bg-card border rounded-2xl overflow-hidden">
            <div className="grid grid-cols-3 bg-primary text-white text-sm font-semibold">
              <div className="p-4">Feature</div>
              <div className="p-4 text-center">TrustFirst+</div>
              <div className="p-4 text-center text-white/70">Other Platforms</div>
            </div>
            {COMPARISONS.map((row, i) => (
              <div key={row.feature} className={`grid grid-cols-3 text-sm border-t ${i % 2 === 0 ? "" : "bg-secondary/30"}`}>
                <div className="p-4 font-medium">{row.feature}</div>
                <div className="p-4 text-center font-semibold text-primary">{row.us}</div>
                <div className="p-4 text-center text-muted-foreground">{row.them}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">Real stories from real people</h2>
          <p className="text-muted-foreground">Don't take our word for it.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STORIES.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="bg-card border rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">{s.avatar}</div>
                <div>
                  <div className="font-semibold text-sm">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.role}</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4 italic">"{s.quote}"</p>
              <span className="text-primary font-semibold text-sm">{s.earnings || s.hired}</span>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-primary text-white py-16">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">Ready to experience the difference?</h2>
          <p className="text-white/80 mb-8">Join 500,000+ professionals who work smarter with TrustFirst+. Free to join, no credit card required.</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/signup/freelancer">
              <Button variant="secondary" className="rounded-full px-8 h-12 font-semibold">I'm a freelancer</Button>
            </Link>
            <Link href="/signup/client">
              <Button variant="outline" className="rounded-full px-8 h-12 font-semibold border-white text-white hover:bg-white hover:text-primary">I'm hiring</Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
