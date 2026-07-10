import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Wallet, type WalletTransaction } from "@/lib/api";
import { useEffect } from "react";

export function useWallet() {
  const qc = useQueryClient();
  const query = useQuery<Wallet>({
    queryKey: ["wallet"],
    queryFn: () => api.get<Wallet>("/wallet"),
  });

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.hostname}:5000/realtime`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "milestone_released" || data.type === "dashboard_update" || data.type === "wallet_update") {
          qc.invalidateQueries({ queryKey: ["wallet"] });
          qc.invalidateQueries({ queryKey: ["wallet", "transactions"] });
        }
      } catch (err) {
        // ignore
      }
    };

    return () => {
      ws.close();
    };
  }, [qc]);

  return query;
}

export function useWalletTransactions() {
  return useQuery<WalletTransaction[]>({
    queryKey: ["wallet", "transactions"],
    queryFn: () => api.get<WalletTransaction[]>("/wallet/transactions"),
  });
}

export function useDeposit() {
  const qc = useQueryClient();
  return useMutation<Wallet, Error, { amount: number; method?: string }>({
    mutationFn: (data) => api.post<Wallet>("/wallet/deposit", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useWithdraw() {
  const qc = useQueryClient();
  return useMutation<Wallet, Error, { amount: number; method?: string }>({
    mutationFn: (data) => api.post<Wallet>("/wallet/withdraw-mock", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}
