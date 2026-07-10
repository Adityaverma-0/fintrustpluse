import { useQuery } from "@tanstack/react-query";
import { api, type ActivityLog } from "@/lib/api";

export function useActivity(projectId: number | undefined) {
  return useQuery<ActivityLog[]>({
    queryKey: ["activity", projectId],
    queryFn: () => api.get<ActivityLog[]>(`/projects/${projectId}/activity`),
    enabled: !!projectId,
    refetchInterval: 30_000,
  });
}
