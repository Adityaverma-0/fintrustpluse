import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Search, SlidersHorizontal, Clock, DollarSign, MapPin, Briefcase, ChevronRight, Loader2 } from "lucide-react";
import { useJobs } from "@/hooks/use-jobs";

const CATEGORIES = ["All Categories", "Development & IT", "Design & Creative", "Writing & Translation", "Finance & Accounting", "Marketing & Sales", "Engineering & Architecture", "Customer Service", "Legal"];

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function BrowseJobs() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [budgetType, setBudgetType] = useState("all");
  const { data: jobs = [], isLoading } = useJobs();

  const filtered = jobs.filter(j => {
    const matchSearch = !search || j.title.toLowerCase().includes(search.toLowerCase()) || (j.skills ?? []).some(s => s.toLowerCase().includes(search.toLowerCase())) || j.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All Categories" || j.category === category;
    const matchBudget = budgetType === "all" || (budgetType === "fixed" && j.budgetType === "fixed") || (budgetType === "hourly" && j.budgetType === "hourly");
    return matchSearch && matchCat && matchBudget;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="bg-gradient-to-r from-primary/5 to-primary/10 border-b py-10">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Find Work</h1>
          <p className="text-muted-foreground mb-6">Browse {jobs.length.toLocaleString()} available jobs from verified clients</p>
          <div className="flex gap-3 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs, skills, or keywords..."
                className="pl-9 h-11 rounded-full"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button className="rounded-full h-11 px-6 bg-primary hover:bg-primary/90">Search</Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <aside className="w-full md:w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" /> Filters</h3>
                <Separator className="mb-4" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
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
                <label className="text-sm font-medium mb-2 block">Payment Type</label>
                <div className="space-y-1.5">
                  {[["all", "All Types"], ["fixed", "Fixed Price"], ["hourly", "Hourly Rate"]].map(([v, l]) => (
                    <button key={v} onClick={() => setBudgetType(v)} className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-all ${budgetType === v ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <label className="text-sm font-medium mb-2 block">Experience Level</label>
                <div className="space-y-1.5">
                  {["Entry Level", "Intermediate", "Expert"].map(l => (
                    <button key={l} className="w-full text-left text-sm px-3 py-2 rounded-lg text-muted-foreground hover:bg-secondary transition-all">
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">{isLoading ? "Loading..." : `${filtered.length} jobs found`}</p>
              <Select defaultValue="recent">
                <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="budget">Highest Budget</SelectItem>
                  <SelectItem value="proposals">Fewest Proposals</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <Briefcase className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-1">No jobs found</h3>
                <p className="text-muted-foreground text-sm">Try adjusting your filters or search terms</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((job, i) => (
                  <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Link href={`/jobs/${job.id}`}>
                      <Card className="cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-base group-hover:text-primary transition-colors truncate">{job.title}</h3>
                                <Badge variant="outline" className="text-xs flex-shrink-0 capitalize">{job.budgetType}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{job.description}</p>
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {(() => {
                                  const skills = Array.isArray(job.skills)
                                    ? job.skills
                                    : (job.skills ? String(job.skills).split(",").map(s => s.trim()).filter(Boolean) : []);
                                  return skills.slice(0, 6).map(s => (
                                    <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                                  ));
                                })()}
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                                {job.budget && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${job.budget.toLocaleString()}</span>}
                                {job.duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.duration}</span>}
                                {job.experienceLevel && <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{job.experienceLevel}</span>}
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.proposalCount ?? 0} proposals</span>
                                <span>{timeAgo(job.createdAt)}</span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              {job.budget && <div className="text-lg font-bold text-primary">${job.budget.toLocaleString()}</div>}
                              <div className="text-xs text-muted-foreground mt-1 capitalize">{job.budgetType}</div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary ml-auto mt-2 transition-colors" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
