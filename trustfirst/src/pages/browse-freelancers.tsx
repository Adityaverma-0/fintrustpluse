import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Search, Star, SlidersHorizontal, CheckCircle, MapPin } from "lucide-react";

const CATEGORIES = ["All Categories", "Development & IT", "Design & Creative", "Writing & Translation", "Finance & Accounting", "Marketing & Sales"];

const FREELANCERS = [
  { id: 5, name: "James Wilson", title: "Full Stack Developer", rate: 85, rating: 4.97, reviews: 142, trust: 97, skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS"], category: "Development & IT", country: "US", earned: "$124K+", bio: "10+ years building scalable web applications. Specialized in React/Node.js SaaS products. Ex-Google engineer.", verified: true, availability: "Available now", initials: "JW", bg: "bg-blue-100 text-blue-700" },
  { id: 6, name: "Priya Patel", title: "UI/UX Designer", rate: 70, rating: 4.95, reviews: 118, trust: 95, skills: ["Figma", "Adobe XD", "Illustrator", "CSS", "Prototyping"], category: "Design & Creative", country: "IN", earned: "$89K+", bio: "Award-winning designer with 8+ years creating digital products. Figma Community contributor with 10K+ followers.", verified: true, availability: "Available now", initials: "PP", bg: "bg-purple-100 text-purple-700" },
  { id: 7, name: "David Kim", title: "AI/ML Engineer", rate: 120, rating: 5.0, reviews: 89, trust: 99, skills: ["Python", "TensorFlow", "PyTorch", "LLMs", "OpenAI"], category: "Development & IT", country: "KR", earned: "$215K+", bio: "AI researcher turned consultant. Published 3 papers on LLMs. Built production AI systems for 20+ companies.", verified: true, availability: "Available in 2 weeks", initials: "DK", bg: "bg-green-100 text-green-700" },
  { id: 8, name: "Ana Martinez", title: "Senior Copywriter", rate: 55, rating: 4.93, reviews: 205, trust: 93, skills: ["SEO", "Content Strategy", "Copywriting", "Email Marketing"], category: "Writing & Translation", country: "ES", earned: "$67K+", bio: "B2B SaaS specialist with 6+ years helping tech companies grow through strategic content. 15+ #1 Google rankings.", verified: true, availability: "Available now", initials: "AM", bg: "bg-orange-100 text-orange-700" },
  { id: 9, name: "Raj Sharma", title: "Financial Consultant", rate: 95, rating: 4.96, reviews: 67, trust: 96, skills: ["Financial Modeling", "Excel", "Accounting", "Valuation", "Pitch Decks"], category: "Finance & Accounting", country: "IN", earned: "$98K+", bio: "Ex-Goldman Sachs analyst. Built financial models for 30+ startups that raised $200M+. CFA Charterholder.", verified: true, availability: "Available now", initials: "RS", bg: "bg-yellow-100 text-yellow-700" },
  { id: 10, name: "Chen Wei", title: "Mobile Developer", rate: 90, rating: 4.91, reviews: 93, trust: 92, skills: ["React Native", "iOS", "Android", "Swift", "Kotlin"], category: "Development & IT", country: "CN", earned: "$142K+", bio: "Mobile-first developer with 9 years experience. Apps I've built have 10M+ downloads on the App Store.", verified: true, availability: "Available now", initials: "CW", bg: "bg-teal-100 text-teal-700" },
];

const FLAG: Record<string, string> = { US: "🇺🇸", IN: "🇮🇳", KR: "🇰🇷", ES: "🇪🇸", CN: "🇨🇳" };

export default function BrowseFreelancers() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");

  const filtered = FREELANCERS.filter(f => {
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.title.toLowerCase().includes(search.toLowerCase()) || f.skills.some(s => s.toLowerCase().includes(search.toLowerCase()));
    const matchCat = category === "All Categories" || f.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* Header */}
      <div className="from-primary/5 to-primary/10 border-b py-10 bg-[#26242400]">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Find Talent</h1>
          <p className="text-muted-foreground mb-6">Browse {FREELANCERS.length.toLocaleString()}+ verified freelancers ready to start</p>
          <div className="flex gap-3 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, skill, or title..." className="pl-9 h-11 rounded-full" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button className="rounded-full h-11 px-6 bg-primary hover:bg-primary/90">Search</Button>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full md:w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" /> Filters</h3>
                <Separator className="mb-4" />
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Category</p>
                <div className="space-y-1.5">
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => setCategory(c)} className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-all ${category === c ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">Hourly Rate</p>
                <div className="space-y-1.5">
                  {["$0–$30/hr", "$30–$60/hr", "$60–$100/hr", "$100+/hr"].map(r => (
                    <button key={r} className="w-full text-left text-sm px-3 py-2 rounded-lg text-muted-foreground hover:bg-secondary transition-all">{r}</button>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">Trust Score</p>
                <div className="space-y-1.5">
                  {["90–100 (Top)", "80–89 (Great)", "70–79 (Good)"].map(r => (
                    <button key={r} className="w-full text-left text-sm px-3 py-2 rounded-lg text-muted-foreground hover:bg-secondary transition-all">{r}</button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Freelancer Cards */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">{filtered.length} freelancers found</p>
            </div>

            <div className="space-y-4">
              {filtered.map((f, i) => (
                <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link href={`/freelancers/${f.id}`}>
                    <Card className="cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-16 w-16 flex-shrink-0">
                            <AvatarFallback className={`${f.bg} font-bold text-lg`}>{f.initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-bold text-base group-hover:text-primary transition-colors">{f.name}</h3>
                              {f.verified && <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />}
                              <Badge className="bg-primary/10 text-primary text-xs">Trust {f.trust}</Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{FLAG[f.country]} {f.country}</span>
                            </div>
                            <p className="text-sm font-medium text-muted-foreground mb-2">{f.title}</p>
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{f.bio}</p>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {f.skills.slice(0, 5).map(s => (
                                <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                              ))}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                              <span className="flex items-center gap-1 text-yellow-600 font-medium">
                                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" /> {f.rating} <span className="text-muted-foreground font-normal text-xs">({f.reviews} reviews)</span>
                              </span>
                              <span className="text-muted-foreground text-xs">{f.earned} earned</span>
                              <span className={`text-xs font-medium ${f.availability === "Available now" ? "text-green-600" : "text-orange-500"}`}>● {f.availability}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xl font-bold text-foreground">${f.rate}<span className="text-sm font-normal text-muted-foreground">/hr</span></div>
                            <Button size="sm" className="mt-3 rounded-full bg-primary hover:bg-primary/90 text-xs">View Profile</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
