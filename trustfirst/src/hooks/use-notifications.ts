import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Notification } from "@/lib/api";
import { useAuth } from "./use-auth";

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => api.get<Notification[]>("/notifications"),
    enabled: isAuthenticated,
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markRead = useMutation({
    mutationFn: (id: number) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch("/notifications/read-all"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return { notifications, unreadCount, markRead: markRead.mutate, markAllRead: markAllRead.mutate };
}
