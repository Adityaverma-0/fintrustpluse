import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type EscrowAccount } from "@/lib/api";

export function useEscrow(projectId: number | undefined) {
  return useQuery<EscrowAccount>({
    queryKey: ["escrow", projectId],
    queryFn: () => api.get<EscrowAccount>(`/projects/${projectId}/escrow`),
    enabled: !!projectId,
    retry: false,
  });
}

export function useFundEscrow(projectId: number) {
  const qc = useQueryClient();
  return useMutation<{ ok: boolean; amount: number }, Error, { amount: number }>({
    mutationFn: (data) => api.post(`/projects/${projectId}/escrow/fund`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["escrow", projectId] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useReleaseMilestone(projectId: number) {
  const qc = useQueryClient();
  return useMutation<{ ok: boolean; amount: number }, Error, number>({
    mutationFn: (milestoneId) =>
      api.post(`/projects/${projectId}/milestones/${milestoneId}/release`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["escrow", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}
