import { useState, useEffect, useCallback } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { getToken, setToken, clearToken, authHeaders } from "@/lib/auth-token";

const ME_KEY = ["auth", "me"];

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  title?: string | null;
  bio?: string | null;
  skills?: string | null;
  hourlyRate?: number | null;
  category?: string | null;
  avatarUrl?: string | null;
  country?: string | null;
  trustScore?: number | null;
  totalEarned?: number | null;
  totalSpent?: number | null;
  completionRate?: number | null;
  isVerified?: boolean | null;
  createdAt?: string;
}

async function fetchMe(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  const res = await fetch("/api/auth/me", { headers: authHeaders() });
  if (!res.ok) {
    if (res.status === 401) clearToken();
    return null;
  }
  return res.json();
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [hasToken, setHasToken] = useState(() => !!getToken());

  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ME_KEY,
    queryFn: fetchMe,
    enabled: hasToken,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const login = useCallback((token: string, userData: AuthUser) => {
    setToken(token);
    setHasToken(true);
    queryClient.setQueryData(ME_KEY, userData);
  }, [queryClient]);

  const logout = useCallback(async () => {
    clearToken();
    setHasToken(false);
    queryClient.removeQueries({ queryKey: ME_KEY });
  }, [queryClient]);

  return {
    user: user ?? null,
    isAuthenticated: !!user,
    isLoading: hasToken ? isLoading : false,
    login,
    logout,
  };
}
