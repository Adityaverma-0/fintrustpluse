import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Star, CheckCircle, MapPin, MessageSquare, Heart, Share2, Award, Briefcase, Clock } from "lucide-react";

const PROFILES: Record<string, any> = {
  "5": { id: 5, name: "James Wilson", title: "Full Stack Developer", rate: 85, rating: 4.97, reviews: 142, trust: 97, skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS", "GraphQL", "Docker"], category: "Development & IT", country: "US", flag: "🇺🇸", earned: "$124K+", bio: "I'm a Senior Full-Stack Developer with 10+ years of experience building high-performance web applications and SaaS platforms. Ex-Google engineer, specialized in React/Node.js ecosystems.\n\nI've worked with startups and Fortune 500 companies to architect and deliver scalable solutions. My approach combines clean code, strong testing practices, and proactive communication to ensure projects succeed.", initials: "JW", bg: "bg-blue-100 text-blue-700", availability: "Available now", completionRate: 98, jobs: 142 },
  "6": { id: 6, name: "Priya Patel", title: "UI/UX Designer", rate: 70, rating: 4.95, reviews: 118, trust: 95, skills: ["Figma", "Adobe XD", "Illustrator", "CSS", "User Research", "Prototyping", "Design Systems"], category: "Design & Creative", country: "IN", flag: "🇮🇳", earned: "$89K+", bio: "Award-winning UI/UX Designer with 8+ years creating world-class digital products. Figma Community contributor with 10K+ followers and multiple Featured Files.\n\nI specialize in building design systems that scale. My designs have been used by apps with millions of users across fintech, healthtech, and e-commerce.", initials: "PP", bg: "bg-purple-100 text-purple-700", availability: "Available now", completionRate: 96, jobs: 118 },
  "7": { id: 7, name: "David Kim", title: "AI/ML Engineer", rate: 120, rating: 5.0, reviews: 89, trust: 99, skills: ["Python", "TensorFlow", "PyTorch", "LLMs", "OpenAI", "RAG", "FastAPI", "LangChain"], category: "Development & IT", country: "KR", flag: "🇰🇷", earned: "$215K+", bio: "AI Researcher turned consultant. I've published 3 papers on large language models and have built production AI systems for 20+ companies, including Series B startups and enterprise clients.\n\nI specialize in LLM integrations, RAG systems, and custom AI pipelines. My chatbots and AI assistants have handled 100M+ queries in production.", initials: "DK", bg: "bg-green-100 text-green-700", availability: "Available in 2 weeks", completionRate: 100, jobs: 89 },
};

const REVIEWS = [
  { reviewer: "Sarah Chen", initials: "SC", rating: 5, date: "May 2026", comment: "Absolutely exceptional work. Delivered ahead of schedule with pristine code quality. James went above and beyond our expectations and was communicative throughout. Will definitely hire again!" },
  { reviewer: "Marcus Johnson", initials: "MJ", rating: 5, date: "Apr 2026", comment: "Incredibly talented developer. The dashboard he built exceeded all our requirements. His understanding of our business needs and technical implementation was impressive." },
  { reviewer: "Emma Rodriguez", initials: "ER", rating: 5, date: "Mar 2026", comment: "One of the best freelancers I've hired on any platform. Great communication, high-quality deliverables, and finished early. 100% recommend." },
];

export default function FreelancerProfile() {
  const params = useParams<{ id: string }>();
  const profile = PROFILES[params.id || "5"] || PROFILES["5"];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-5 flex-wrap">
                    <Avatar className="h-20 w-20 flex-shrink-0">
                      <AvatarFallback className={`${profile.bg} font-bold text-2xl`}>{profile.initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h1 className="text-2xl font-bold">{profile.name}</h1>
                        <CheckCircle className="h-5 w-5 text-primary" />
                        <Badge className="bg-primary/10 text-primary">Trust {profile.trust}</Badge>
                      </div>
                      <p className="text-muted-foreground font-medium mb-2">{profile.title}</p>
                      <div className="flex items-center gap-4 flex-wrap text-sm">
                        <span className="flex items-center gap-1 text-yellow-600 font-medium">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          {profile.rating} <span className="text-muted-foreground font-normal">({profile.reviews} reviews)</span>
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />{profile.flag} {profile.country}
                        </span>
                        <span className={`font-medium text-sm ${profile.availability === "Available now" ? "text-green-600" : "text-orange-500"}`}>
                          ● {profile.availability}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button variant="outline" size="icon" className="rounded-full h-9 w-9">
                        <Heart className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="rounded-full h-9 w-9">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* About */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardContent className="p-6">
                  <h2 className="font-bold text-lg mb-3">About</h2>
                  <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{profile.bio}</div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Skills */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card>
                <CardContent className="p-6">
                  <h2 className="font-bold text-lg mb-3">Skills</h2>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((s: string) => (
                      <Badge key={s} variant="secondary" className="text-sm px-3 py-1">{s}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Reviews */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <h2 className="font-bold text-lg">Reviews</h2>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold">{profile.rating}</span>
                      <span className="text-muted-foreground text-sm">({profile.reviews})</span>
                    </div>
                  </div>
                  <div className="space-y-5">
                    {REVIEWS.map((r, i) => (
                      <div key={i} className={i > 0 ? "pt-5 border-t" : ""}>
                        <div className="flex items-center gap-3 mb-2">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="text-xs font-bold bg-secondary">{r.initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{r.reviewer}</p>
                            <div className="flex items-center gap-2">
                              <div className="flex gap-0.5">
                                {[...Array(r.rating)].map((_, j) => <Star key={j} className="h-3 w-3 fill-yellow-400 text-yellow-400" />)}
                              </div>
                              <span className="text-xs text-muted-foreground">{r.date}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{r.comment}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Hire Card */}
            <Card className="sticky top-24 border-primary/20 shadow-lg">
              <CardContent className="p-6">
                <div className="text-center mb-5">
                  <div className="text-3xl font-black">${profile.rate}<span className="text-base font-normal text-muted-foreground">/hr</span></div>
                  <p className="text-sm text-muted-foreground mt-1">Fixed price or hourly</p>
                </div>
                <div className="space-y-3 mb-5">
                  <Button className="w-full h-11 rounded-full bg-primary hover:bg-primary/90 font-semibold">
                    Hire Now
                  </Button>
                  <Link href="/messages">
                    <Button variant="outline" className="w-full h-11 rounded-full">
                      <MessageSquare className="h-4 w-4 mr-2" /> Message
                    </Button>
                  </Link>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  {[
                    { icon: Award, label: "Trust Score", value: `${profile.trust}/100` },
                    { icon: Star, label: "Rating", value: `${profile.rating}/5.0` },
                    { icon: Briefcase, label: "Jobs Completed", value: profile.jobs },
                    { icon: CheckCircle, label: "Success Rate", value: `${profile.completionRate}%` },
                    { icon: Clock, label: "Response Time", value: "< 1 hour" },
                  ].map(m => (
                    <div key={m.label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <m.icon className="h-4 w-4" /> {m.label}
                      </span>
                      <span className="font-semibold">{m.value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t text-center">
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    All payments protected by TrustFirst+ Escrow
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="text-sm font-semibold mb-3">Performance Stats</h3>
                {[
                  { label: "Job Success", value: profile.completionRate },
                  { label: "Client Satisfaction", value: 99 },
                  { label: "On-time Delivery", value: 97 },
                  { label: "Rehire Rate", value: 82 },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className="font-medium">{s.value}%</span>
                    </div>
                    <Progress value={s.value} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
