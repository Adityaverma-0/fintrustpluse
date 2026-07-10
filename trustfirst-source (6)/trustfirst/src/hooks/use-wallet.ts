import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Wallet, type WalletTransaction } from "@/lib/api";

export function useWallet() {
  return useQuery<Wallet>({
    queryKey: ["wallet"],
    queryFn: () => api.get<Wallet>("/wallet"),
  });
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
    mutationFn: (data) => api.post<Wallet>("/wallet/withdraw", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}
