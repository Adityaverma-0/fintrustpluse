import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Submission } from "@/lib/api";

export function useSubmissions(projectId: number | undefined) {
  return useQuery<Submission[]>({
    queryKey: ["submissions", projectId],
    queryFn: () => api.get<Submission[]>(`/projects/${projectId}/submissions`),
    enabled: !!projectId,
  });
}

export function useCreateSubmission(projectId: number) {
  const qc = useQueryClient();
  return useMutation<Submission, Error, { description: string; files?: string; milestoneId?: number }>({
    mutationFn: (data) => api.post<Submission>(`/projects/${projectId}/submissions`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submissions", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useReviewSubmission(projectId: number) {
  const qc = useQueryClient();
  return useMutation<Submission, Error, { submissionId: number; status: "approved" | "rejected"; clientFeedback?: string }>({
    mutationFn: ({ submissionId, ...data }) =>
      api.patch<Submission>(`/projects/${projectId}/submissions/${submissionId}/review`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submissions", projectId] });
    },
  });
}
