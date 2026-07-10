import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type Job = {
  id: number;
  clientId: number;
  title: string;
  description: string;
  category: string;
  skills: string[] | null;
  budget: number | null;
  budgetType: string;
  experienceLevel: string | null;
  duration: string | null;
  status: string;
  proposalCount: number | null;
  createdAt: string;
};

export function useJobs() {
  return useQuery<Job[]>({
    queryKey: ["jobs"],
    queryFn: () => api.get<Job[]>("/jobs"),
    staleTime: 60000,
  });
}
