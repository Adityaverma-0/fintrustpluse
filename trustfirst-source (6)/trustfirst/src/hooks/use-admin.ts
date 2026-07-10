import { useQuery } from "@tanstack/react-query";
import { api, type AdminStats } from "@/lib/api";

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ["admin", "stats"],
    queryFn: () => api.get<AdminStats>("/admin/stats"),
  });
}

export function useAdminUsers() {
  return useQuery<any[]>({
    queryKey: ["admin", "users"],
    queryFn: () => api.get<any[]>("/admin/users"),
  });
}

export function useAdminDisputes() {
  return useQuery<any[]>({
    queryKey: ["admin", "disputes"],
    queryFn: () => api.get<any[]>("/admin/disputes"),
  });
}
