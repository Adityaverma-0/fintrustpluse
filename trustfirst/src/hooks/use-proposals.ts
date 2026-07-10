import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Proposal } from "@/lib/api";
import { useAuth } from "./use-auth";

export function useMyProposals() {
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();

  const { data: proposals = [], isLoading } = useQuery<Proposal[]>({
    queryKey: ["proposals", "mine"],
    queryFn: () => api.get<Proposal[]>("/proposals/mine"),
    enabled: isAuthenticated,
    staleTime: 30000,
  });

  const submitProposal = useMutation({
    mutationFn: (body: { jobId: number; coverLetter: string; bidAmount: number; deliveryDays: number }) =>
      api.post<Proposal>("/proposals", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });

  const withdrawProposal = useMutation({
    mutationFn: (id: number) => api.patch<Proposal>(`/proposals/${id}/status`, { status: "withdrawn" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });

  return { proposals, isLoading, submitProposal, withdrawProposal };
}

export function useJobProposals(jobId: number | null) {
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();

  const { data: proposals = [], isLoading } = useQuery<Proposal[]>({
    queryKey: ["proposals", "job", jobId],
    queryFn: () => api.get<Proposal[]>(`/jobs/${jobId}/proposals`),
    enabled: isAuthenticated && jobId != null,
    staleTime: 30000,
  });

  const acceptProposal = useMutation({
    mutationFn: ({ id, body }: { id: number; body?: any }) => api.post<any>(`/proposals/${id}/accept`, body || {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const rejectProposal = useMutation({
    mutationFn: (id: number) => api.patch<Proposal>(`/proposals/${id}/status`, { status: "rejected" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });

  return { proposals, isLoading, acceptProposal, rejectProposal };
}
