import { Link } from "wouter";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Shield, Zap, Globe, ArrowRight, CheckCircle, TrendingUp, Users, DollarSign, Code2, Palette, PenLine, Landmark, Megaphone, Headphones, Wrench, Scale, type LucideIcon } from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Development & IT": Code2,
  "Design & Creative": Palette,
  "Writing & Translation": PenLine,
  "Finance & Accounting": Landmark,
  "Marketing & Sales": Megaphone,
  "Customer Service": Headphones,
  "Engineering & Architecture": Wrench,
  "Legal": Scale,
};

const categories = [
  { label: "Development & IT", count: "2,340+", icon: "💻" },
  { label: "Design & Creative", count: "1,820+", icon: "🎨" },
  { label: "Writing & Translation", count: "890+", icon: "✍️" },
  { label: "Finance & Accounting", count: "640+", icon: "📊" },
  { label: "Marketing & Sales", count: "1,150+", icon: "📣" },
  { label: "Customer Service", count: "430+", icon: "🤝" },
  { label: "Engineering & Architecture", count: "780+", icon: "⚙️" },
  { label: "Legal", count: "320+", icon: "⚖️" },
];

const freelancers = [
  { name: "James Wilson", title: "Full Stack Developer", rate: "$85/hr", rating: 4.97, jobs: 142, trust: 97, skills: ["React", "Node.js", "TypeScript"], initials: "JW", bg: "bg-blue-100 text-blue-700", image: "/freelancer-1.png" },
  { name: "Priya Patel", title: "UI/UX Designer", rate: "$70/hr", rating: 4.95, jobs: 118, trust: 95, skills: ["Figma", "Adobe XD", "CSS"], initials: "PP", bg: "bg-purple-100 text-purple-700", image: "/freelancer-2.png" },
  { name: "David Kim", title: "AI/ML Engineer", rate: "$120/hr", rating: 5.0, jobs: 89, trust: 99, skills: ["Python", "TensorFlow", "LLMs"], initials: "DK", bg: "bg-green-100 text-green-700", image: "/freelancer-3.png" },
  { name: "Ana Martinez", title: "Senior Copywriter", rate: "$55/hr", rating: 4.93, jobs: 205, trust: 93, skills: ["SEO", "Content", "Copywriting"], initials: "AM", bg: "bg-orange-100 text-orange-700", image: "/freelancer-4.png" },
];

const stats = [
  { value: "850K+", label: "Registered Freelancers", icon: Users },
  { value: "$2.4B+", label: "Total Paid Out", icon: DollarSign },
  { value: "98.7%", label: "Escrow Success Rate", icon: Shield },
  { value: "4.9/5", label: "Average Client Rating", icon: Star },
];

const testimonials = [
  { quote: "TrustFirst+ changed how I hire globally. The AI matching found the perfect developer in under 2 hours, and the escrow system gave me total peace of mind.", name: "Sarah Chen", position: "CTO", company: "TechCorp", photo: "https://randomuser.me/api/portraits/women/44.jpg" },
  { quote: "I've earned over $215K on this platform. The smart contracts, milestone tracking, and instant payouts are miles ahead of any other freelance platform.", name: "David Kim", position: "Founder & CEO", company: "NovaBuild", photo: "https://randomuser.me/api/portraits/men/32.jpg" },
  { quote: "We found a world-class designer and shipped our rebrand in 3 weeks. TrustFirst+'s escrow gave our board complete confidence in every payment.", name: "Marcus Webb", position: "Co-Founder", company: "Lighthouse AI", photo: "https://randomuser.me/api/portraits/men/75.jpg" },
  { quote: "Our engineering team doubled in velocity after hiring through TrustFirst+. The talent quality and Trust Score system make vetting effortless.", name: "Priya Nair", position: "VP of Engineering", company: "DataJoi", photo: "https://randomuser.me/api/portraits/women/68.jpg" },
  { quote: "As a freelancer, I've never felt more protected. Milestone-based escrow means I always get paid, and clients love the transparency.", name: "James Okafor", position: "Lead Developer", company: "Independent", photo: "https://randomuser.me/api/portraits/men/52.jpg" },
  { quote: "TrustFirst+ is the only platform where I can confidently hire globally without worrying about quality or payment disputes. Truly enterprise-grade.", name: "Lena Kowalski", position: "Chief Operating Officer", company: "Pronty Labs", photo: "https://randomuser.me/api/portraits/women/24.jpg" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* Hero */}
      <section className="relative overflow-hidden py-24 flex items-center justify-center min-h-[520px]">
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", zIndex: 0,
          }}
          src="/hero-bg.mp4"
        />
        <div className="absolute inset-0 bg-black/50" style={{ zIndex: 1 }} />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6 text-center">
              Hire Top Talent.{" "}
              <span className="text-center text-[#378a11]">Pay with Confidence.</span>
            </h1>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/freelancers">
                <Button size="lg" className="hover:bg-primary/90 text-white rounded-full px-8 h-14 text-base font-semibold shadow-lg shadow-primary/30 bg-[#428024e6]">
                  Find Talent <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/jobs">
                <Button size="lg" variant="outline" className="rounded-full px-8 h-14 text-base font-semibold border-white/20 text-white hover:bg-white/10">
                  Find Work
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
      {/* Categories */}
      <section className="py-20" style={{ backgroundColor: "#101820" }}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "#f0e7e4" }}>Browse by Category</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat, i) => {
              const Icon = CATEGORY_ICONS[cat.label] ?? Code2;
              return (
                <motion.div
                  key={cat.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  viewport={{ once: true }}
                >
                  <Link href={`/freelancers?category=${encodeURIComponent(cat.label)}`}>
                    <div
                      className="cursor-pointer flex flex-col transition-all duration-300"
                      style={{
                        height: 180,
                        padding: 24,
                        borderRadius: 20,
                        background: "linear-gradient(145deg,#1b1b1b,#242424)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLDivElement;
                        el.style.transform = "translateY(-8px)";
                        el.style.border = "1px solid rgba(34,197,94,0.5)";
                        el.style.boxShadow = "0 20px 48px rgba(0,0,0,0.4), 0 0 32px rgba(34,197,94,0.15)";
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLDivElement;
                        el.style.transform = "translateY(0)";
                        el.style.border = "1px solid rgba(255,255,255,0.07)";
                        el.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";
                      }}
                    >
                      <Icon
                        style={{ width: 32, height: 32, color: "#22c55e", marginBottom: 16, flexShrink: 0 }}
                        strokeWidth={1.5}
                      />
                      <div style={{ fontSize: 24, fontWeight: 600, color: "#ffffff", lineHeight: 1.2, marginBottom: 8 }}>
                        {cat.label}
                      </div>
                      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
                        {cat.count} freelancers
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
      {/* Top Freelancers */}
      <section className="py-20 bg-[#2b538740]" style={{ backgroundColor: "#101820" }}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: "#f0e7e4" }}>Top-Rated Freelancers</h2>
              
            </div>
            <Link href="/freelancers">
              <Button variant="outline" className="rounded-full hidden md:flex items-center gap-2">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {freelancers.map((f, i) => (
              <motion.div
                key={f.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <div
                  className="group cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 flex flex-col"
                  style={{
                    background: "#f0e7e4",
                    border: "1px solid rgba(16,24,32,0.10)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(-6px)";
                    (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(34,197,94,0.5)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 24px 56px rgba(0,0,0,0.18), 0 0 24px rgba(34,197,94,0.12)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(16,24,32,0.10)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.12)";
                  }}
                >
                  {/* Photo banner */}
                  <div
                    className="w-full relative overflow-hidden flex items-center justify-center"
                    style={{
                      height: 260,
                      borderBottom: "1px solid rgba(16,24,32,0.08)",
                      background: "#111",
                    }}
                  >
                    <img
                      src={f.image}
                      alt={f.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center top",
                        display: "block",
                      }}
                    />
                    {/* Trust badge */}
                    <div
                      className="absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(34,197,94,0.15)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.35)", backdropFilter: "blur(4px)" }}
                    >
                      ✦ {f.trust}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="font-bold text-base mb-0.5" style={{ color: "#101820" }}>{f.name}</div>
                    <div className="text-xs mb-4" style={{ color: "rgba(16,24,32,0.5)" }}>{f.title}</div>

                    {/* Divider */}
                    <div style={{ height: 1, background: "rgba(16,24,32,0.08)", marginBottom: 14 }} />

                    {/* Stats row */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                        <span className="text-sm font-bold" style={{ color: "#101820" }}>{f.rating}</span>
                      </div>
                      <div className="flex items-center gap-1" style={{ color: "rgba(16,24,32,0.5)" }}>
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span className="text-xs">{f.jobs} jobs</span>
                      </div>
                    </div>

                    {/* Hire button */}
                    <div className="mt-auto">
                      <div
                        className="w-full text-sm font-bold px-4 py-2.5 rounded-xl text-center"
                        style={{
                          background: "#22c55e",
                          color: "#fff",
                          letterSpacing: "0.02em",
                          boxShadow: "0 2px 12px rgba(34,197,94,0.3)",
                        }}
                      >
                        <span className="block group-hover:hidden">{f.rate}</span>
                        <span className="hidden group-hover:block">Hire →</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      {/* AI Talent Era — Fiverr-style hero showcase */}
      <section className="py-16" style={{ backgroundColor: "#101820" }}>
        <div className="mx-auto px-6" style={{ maxWidth: 1400 }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{
              background: "#050505",
              borderRadius: 24,
              overflow: "hidden",
              padding: "60px 64px",
              display: "flex",
              alignItems: "center",
              gap: 56,
              flexWrap: "wrap",
              boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
              transition: "box-shadow 0.3s ease",
            }}
            whileHover={{ boxShadow: "0 40px 100px rgba(0,0,0,0.65)" }}
          >
            {/* LEFT — text (45%) */}
            <motion.div
              initial={{ opacity: 0, x: -32 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              viewport={{ once: true }}
              style={{ flex: "0 0 42%", minWidth: 280 }}
            >
              <h2
                style={{
                  fontSize: "clamp(32px, 3.5vw, 52px)",
                  fontWeight: 700,
                  color: "#ffffff",
                  lineHeight: 1.15,
                  marginBottom: 20,
                  letterSpacing: "-0.5px",
                }}
              >
                The AI Talent Era<br />Has Arrived
              </h2>
              <p
                style={{
                  fontSize: 16,
                  color: "rgba(255,255,255,0.6)",
                  lineHeight: 1.7,
                  marginBottom: 36,
                  maxWidth: 380,
                }}
              >
                Discover verified experts powered by AI matching. Hire faster, work smarter, and build with the world's most trusted freelance marketplace.
              </p>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  background: "#ffffff",
                  color: "#050505",
                  border: "none",
                  borderRadius: 9999,
                  padding: "14px 32px",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  letterSpacing: "-0.1px",
                }}
              >
                Find Your Talent
              </motion.button>
            </motion.div>

            {/* RIGHT — video (55%) */}
            <motion.div
              initial={{ opacity: 0, x: 32 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
              viewport={{ once: true }}
              style={{ flex: "1 1 52%", minWidth: 280, position: "relative" }}
            >
              {/* Glow halo behind video */}
              <div
                style={{
                  position: "absolute",
                  inset: -24,
                  borderRadius: 32,
                  background: "radial-gradient(ellipse at center, rgba(34,197,94,0.18) 0%, transparent 70%)",
                  pointerEvents: "none",
                  zIndex: 0,
                }}
              />
              <div style={{ position: "relative", zIndex: 1, borderRadius: 16, overflow: "hidden" }}>
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover rounded-2xl"
                  style={{ display: "block", borderRadius: 16 }}
                >
                  <source src="/ai-talent-hero.mp4" type="video/mp4" />
                </video>
                {/* Subtle gradient overlay at bottom */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 80,
                    background: "linear-gradient(to top, rgba(5,5,5,0.5), transparent)",
                    borderRadius: "0 0 16px 16px",
                    pointerEvents: "none",
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
      {/* Testimonials */}
      <section className="py-24 relative overflow-hidden" style={{ backgroundColor: "#f5f7f2" }}>
        {/* Abstract green curves — Upwork-style background decoration */}
        <svg
          aria-hidden="true"
          style={{ position: "absolute", left: 0, top: "10%", width: 520, opacity: 0.18, pointerEvents: "none" }}
          viewBox="0 0 520 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <ellipse cx="120" cy="300" rx="320" ry="220" fill="#22c55e" transform="rotate(-30 120 300)" />
        </svg>
        <svg
          aria-hidden="true"
          style={{ position: "absolute", right: 0, bottom: "5%", width: 420, opacity: 0.13, pointerEvents: "none" }}
          viewBox="0 0 420 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <ellipse cx="300" cy="250" rx="280" ry="180" fill="#16a34a" transform="rotate(20 300 250)" />
        </svg>

        <div className="relative z-10 mx-auto px-6" style={{ maxWidth: 1400 }}>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ fontSize: 56, fontWeight: 700, color: "#101820", textAlign: "center", marginBottom: 56, lineHeight: 1.1 }}
          >
            What Our Community Says
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                viewport={{ once: true }}
              >
                <div
                  style={{
                    background: "#f8f9f7",
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: 20,
                    padding: "32px 28px 28px",
                    minHeight: 320,
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                    transition: "transform 0.25s ease, box-shadow 0.25s ease",
                    cursor: "default",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "translateY(-5px)";
                    el.style.boxShadow = "0 16px 40px rgba(0,0,0,0.12)";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "translateY(0)";
                    el.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)";
                  }}
                >
                  {/* Quote */}
                  <p style={{ fontSize: 16, lineHeight: 1.7, color: "#1a1a1a", flex: 1, marginBottom: 32 }}>
                    "{t.quote}"
                  </p>

                  {/* Footer: name/company left, photo right */}
                  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#101820" }}>{t.name}</div>
                      <div style={{ fontSize: 13, color: "rgba(16,24,32,0.55)", marginTop: 2 }}>{t.position}</div>
                      <div style={{ fontSize: 13, color: "rgba(16,24,32,0.4)", marginTop: 1 }}>{t.company}</div>
                    </div>
                    <img
                      src={t.photo}
                      alt={t.name}
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "2px solid rgba(34,197,94,0.35)",
                        flexShrink: 0,
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      {/* CTA */}
      <section className="py-20 relative overflow-hidden text-white">
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", zIndex: 0,
          }}
          src="/cta-bg.mp4"
        />
        <div className="absolute inset-0 bg-black/55" style={{ zIndex: 1 }} />
        <div className="container mx-auto px-4 text-center" style={{ position: "relative", zIndex: 2 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to get started?</h2>
            <p className="text-white/80 text-lg mb-10 max-w-2xl mx-auto">
              Join 850,000+ professionals on the platform that puts trust first.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup/client">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 rounded-full px-8 h-14 text-base font-semibold">
                  Hire a Freelancer
                </Button>
              </Link>
              <Link href="/signup/freelancer">
                <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 rounded-full px-8 h-14 text-base font-semibold">
                  Apply as Freelancer
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
