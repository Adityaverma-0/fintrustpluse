import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffect } from "react";
import { useAuth } from "./use-auth";

export interface Conversation {
  partner: {
    id: number;
    name: string;
    role: string;
  };
  lastMessage: {
    id: number;
    senderId: number;
    receiverId: number;
    content: string;
    createdAt: string;
    isRead: boolean;
  } | null;
  unreadCount: number;
}

export interface ChatMessage {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  projectId: number | null;
  createdAt: string;
  isRead: boolean;
}

export function useConversations() {
  return useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => api.get<Conversation[]>("/messages/conversations"),
    refetchInterval: 10000, // Fallback polling
  });
}

export function useChatMessages(otherId: number | undefined) {
  return useQuery<ChatMessage[]>({
    queryKey: ["messages", otherId],
    queryFn: () => api.get<ChatMessage[]>(`/messages/${otherId}`),
    enabled: !!otherId && !isNaN(otherId),
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation<ChatMessage, Error, { receiverId: number; content: string; projectId?: number }>({
    mutationFn: (body) => api.post<ChatMessage>("/messages", body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["messages", data.receiverId] });
    },
  });
}

export function useRealtimeMessages(onMessageReceived?: (msg: ChatMessage) => void) {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    // Connect to port 5000 where our backend server runs
    const wsUrl = `${protocol}//${host}:5000/realtime?userId=${user.id}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "message") {
          const msg = payload.data as ChatMessage;
          const otherId = msg.senderId === user.id ? msg.receiverId : msg.senderId;

          // Invalidate both lists
          qc.invalidateQueries({ queryKey: ["conversations"] });
          qc.invalidateQueries({ queryKey: ["messages", otherId] });

          if (onMessageReceived) {
            onMessageReceived(msg);
          }
        }
      } catch (e) {
        console.error("Error parsing WS event:", e);
      }
    };

    return () => {
      ws.close();
    };
  }, [user, qc, onMessageReceived]);
}
