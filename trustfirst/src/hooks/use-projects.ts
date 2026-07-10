import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Project, type Milestone } from "@/lib/api";
import { useAuth } from "./use-auth";

export function useProjects() {
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => api.get<Project[]>("/projects"),
    enabled: isAuthenticated,
    staleTime: 30000,
  });

  const createProject = useMutation({
    mutationFn: (body: { freelancerId: number; title: string; description: string; budget: number; jobId?: number }) =>
      api.post<Project>("/projects", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch<Project>(`/projects/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });

  const addMilestone = useMutation({
    mutationFn: ({ projectId, ...body }: { projectId: number; title: string; description?: string; amount: number; order?: number }) =>
      api.post<Milestone>(`/projects/${projectId}/milestones`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });

  const updateMilestoneStatus = useMutation({
    mutationFn: ({ id, status, deliverables, clientFeedback }: { id: number; status: string; deliverables?: string; clientFeedback?: string }) =>
      api.patch<Milestone>(`/milestones/${id}/status`, { status, deliverables, clientFeedback }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });

  return { projects, isLoading, createProject, updateStatus, addMilestone, updateMilestoneStatus };
}
