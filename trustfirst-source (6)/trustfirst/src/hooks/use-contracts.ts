import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Contract } from "@/lib/api";

export function useContract(projectId: number | undefined) {
  return useQuery<Contract>({
    queryKey: ["contract", projectId],
    queryFn: () => api.get<Contract>(`/projects/${projectId}/contract`),
    enabled: !!projectId,
    retry: false,
  });
}

export function useGenerateContract(projectId: number) {
  const qc = useQueryClient();
  return useMutation<Contract, Error, Partial<{
    scope: string;
    deliverables: string;
    timeline: string;
    revisionPolicy: string;
    refundPolicy: string;
    paymentTerms: string;
    milestoneBreakdown: string;
  }>>({
    mutationFn: (data) => api.post<Contract>(`/projects/${projectId}/contract`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract", projectId] });
    },
  });
}

export function useSignContract(projectId: number) {
  const qc = useQueryClient();
  return useMutation<Contract, Error, void>({
    mutationFn: () => api.patch<Contract>(`/projects/${projectId}/contract/sign`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract", projectId] });
    },
  });
}
