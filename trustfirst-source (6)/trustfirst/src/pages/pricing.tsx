import { motion } from "framer-motion";
import { Link } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, ArrowRight, HelpCircle } from "lucide-react";

const FREELANCER_PLANS = [
  {
    name: "Basic",
    price: "Free",
    fee: "20% platform fee",
    desc: "Great for getting started and building your reputation.",
    features: [
      { label: "Up to 3 active proposals", ok: true },
      { label: "Basic profile listing", ok: true },
      { label: "Escrow protection", ok: true },
      { label: "Standard support", ok: true },
      { label: "AI job matching", ok: false },
      { label: "Profile boost", ok: false },
      { label: "Reduced fees", ok: false },
    ],
    cta: "Start free",
    href: "/signup/freelancer",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/mo",
    fee: "10% platform fee",
    desc: "For serious freelancers who want maximum earnings and visibility.",
    badge: "Most Popular",
    features: [
      { label: "Unlimited proposals", ok: true },
      { label: "Featured profile listing", ok: true },
      { label: "Escrow protection", ok: true },
      { label: "Priority 24/7 support", ok: true },
      { label: "AI job matching", ok: true },
      { label: "Profile boost (2×/mo)", ok: true },
      { label: "Reduced 10% fee", ok: true },
    ],
    cta: "Start Pro",
    href: "/signup/freelancer",
    highlight: true,
  },
  {
    name: "Agency",
    price: "$49",
    period: "/mo",
    fee: "8% platform fee",
    desc: "For agencies and teams managing multiple freelancers.",
    features: [
      { label: "Unlimited proposals", ok: true },
      { label: "Team dashboard", ok: true },
      { label: "Escrow protection", ok: true },
      { label: "Dedicated account manager", ok: true },
      { label: "AI job matching", ok: true },
      { label: "Unlimited profile boosts", ok: true },
      { label: "Lowest 8% fee", ok: true },
    ],
    cta: "Start Agency",
    href: "/signup/freelancer",
    highlight: false,
  },
];

const CLIENT_FEATURES = [
  { label: "Post unlimited jobs", ok: true },
  { label: "AI-powered talent matching", ok: true },
  { label: "Smart escrow for all contracts", ok: true },
  { label: "Milestone & payment tracking", ok: true },
  { label: "Dispute resolution", ok: true },
  { label: "Team collaboration tools", ok: true },
  { label: "Dedicated account manager", note: "Enterprise only" },
];

const FAQS = [
  {
    q: "When do I pay the platform fee?",
    a: "The platform fee is deducted when a milestone is released from escrow. There are no upfront charges.",
  },
  {
    q: "Is the escrow fee separate?",
    a: "No — escrow is included in the platform fee. There are no extra escrow or payment processing fees.",
  },
  {
    q: "Can I downgrade my plan?",
    a: "Yes, you can change or cancel your plan at any time. Changes take effect at the next billing cycle.",
  },
  {
    q: "Is there a free trial for Pro?",
    a: "Yes! Pro comes with a 14-day free trial. No credit card required to start.",
  },
  {
    q: "What currency are prices in?",
    a: "All prices are in USD. We support payments in 30+ currencies via our payment partners.",
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="bg-gradient-to-br from-primary/5 via-background to-accent/10 py-16 text-center">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-block bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-4">Pricing</span>
            <h1 className="text-4xl font-bold mb-4">Simple, transparent pricing</h1>
            <p className="text-muted-foreground text-lg">No hidden fees. No surprises. Keep more of what you earn.</p>
          </motion.div>
        </div>
      </section>

      <section className="py-16 container mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-10">For Freelancers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {FREELANCER_PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className={`relative bg-card border rounded-2xl p-6 flex flex-col ${plan.highlight ? "border-primary ring-2 ring-primary/20 shadow-lg" : ""}`}
            >
              {plan.badge && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white">{plan.badge}</Badge>
              )}
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-muted-foreground text-sm">{plan.period}</span>}
                </div>
                <div className="text-sm text-primary font-medium mb-2">{plan.fee}</div>
                <p className="text-muted-foreground text-sm">{plan.desc}</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map(f => (
                  <li key={f.label} className="flex items-center gap-2 text-sm">
                    {f.ok
                      ? <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      : <XCircle className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />}
                    <span className={f.ok ? "" : "text-muted-foreground/60"}>{f.label}</span>
                  </li>
                ))}
              </ul>
              <Link href={plan.href}>
                <Button
                  className={`w-full rounded-full ${plan.highlight ? "bg-primary hover:bg-primary/90 text-white" : ""}`}
                  variant={plan.highlight ? "default" : "outline"}
                >
                  {plan.cta} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-secondary/50 py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">For Clients</h2>
            <p className="text-muted-foreground">Hiring on TrustFirst+ is free. You only pay for the talent you hire.</p>
          </div>
          <div className="bg-card border rounded-2xl p-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <div className="text-4xl font-bold mb-1">Free</div>
              <div className="text-muted-foreground text-sm mb-6">to post jobs and hire talent</div>
              <ul className="space-y-3">
                {CLIENT_FEATURES.map(f => (
                  <li key={f.label} className="flex items-center gap-2 text-sm">
                    {f.ok !== false
                      ? <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      : <HelpCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                    <span>{f.label}</span>
                    {f.note && <span className="text-xs text-muted-foreground">({f.note})</span>}
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-sm mb-4">A small client service fee (3–5%) applies to contract payments to cover escrow and payment processing.</p>
              <Link href="/signup/client">
                <Button className="rounded-full bg-primary hover:bg-primary/90 px-8 h-12 font-semibold w-full">
                  Post a job free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground mt-3">No credit card required</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 container mx-auto px-4 max-w-2xl">
        <h2 className="text-2xl font-bold text-center mb-10">Frequently asked questions</h2>
        <div className="space-y-4">
          {FAQS.map((faq, i) => (
            <motion.div
              key={faq.q}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              viewport={{ once: true }}
              className="bg-card border rounded-xl p-5"
            >
              <h3 className="font-semibold mb-2">{faq.q}</h3>
              <p className="text-muted-foreground text-sm">{faq.a}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
