import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useWallet } from "@/hooks/use-wallet";
import { DollarSign, Shield, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, Wallet, TrendingUp, Plus, Loader2 } from "lucide-react";

const TX_ICONS: Record<string, React.ElementType> = {
  credit: ArrowDownLeft,
  debit: ArrowUpRight,
  escrow_hold: Shield,
  escrow_release: CheckCircle,
  withdrawal: ArrowUpRight,
};

const TX_COLORS: Record<string, string> = {
  credit: "text-green-600 bg-green-50",
  debit: "text-red-600 bg-red-50",
  escrow_hold: "text-primary bg-primary/10",
  escrow_release: "text-green-600 bg-green-50",
  withdrawal: "text-red-600 bg-red-50",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function WalletPage() {
  const { user } = useAuth();
  const { wallet, transactions, isLoading } = useWallet();
  const isFreelancer = user?.role === "freelancer";

  const available = wallet?.availableBalance ?? 0;
  const inEscrow = wallet?.escrowBalance ?? 0;
  const lifetime = isFreelancer ? (wallet?.totalEarned ?? 0) : (wallet?.totalSpent ?? 0);

  const balanceCards = [
    { label: "Available Balance", value: `$${available.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: Wallet, color: "text-green-600", bg: "bg-green-50" },
    { label: "In Escrow (Protected)", value: `$${inEscrow.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: Shield, color: "text-primary", bg: "bg-primary/5" },
    { label: isFreelancer ? "Lifetime Earned" : "Lifetime Spent", value: `$${lifetime.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Processing", value: "$0.00", icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  return (
    <div className="min-h-screen bg-secondary/20">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold">Wallet</h1>
              <p className="text-muted-foreground text-sm">Manage your funds and transactions</p>
            </div>
            <div className="flex gap-3">
              {isFreelancer ? (
                <Button className="rounded-full bg-primary hover:bg-primary/90 gap-2" disabled={available === 0}>
                  <ArrowUpRight className="h-4 w-4" /> Withdraw Funds
                </Button>
              ) : (
                <Button className="rounded-full bg-primary hover:bg-primary/90 gap-2">
                  <Plus className="h-4 w-4" /> Add Funds
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {balanceCards.map((c, i) => (
                  <motion.div key={c.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                    <Card>
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.bg}`}>
                            <c.icon className={`h-4 w-4 ${c.color}`} />
                          </div>
                          <span className="text-xs text-muted-foreground leading-tight">{c.label}</span>
                        </div>
                        <div className="text-2xl font-bold">{c.value}</div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-8 flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-primary">Smart Escrow Protection</p>
                  <p className="text-xs text-muted-foreground">
                    {isFreelancer
                      ? `$${inEscrow.toLocaleString(undefined, { minimumFractionDigits: 2 })} is securely held by TrustFirst+ and released when your milestones are approved.`
                      : `$${inEscrow.toLocaleString(undefined, { minimumFractionDigits: 2 })} is held in escrow, protecting both you and your freelancers.`}
                  </p>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="px-6 py-4 border-b">
                    <h2 className="font-semibold">Transaction History</h2>
                  </div>

                  {transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Wallet className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">No transactions yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Your transaction history will appear here</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {transactions.map((tx) => {
                        const Icon = TX_ICONS[tx.type] ?? DollarSign;
                        const colorClass = TX_COLORS[tx.type] ?? "text-muted-foreground bg-secondary";
                        const isCredit = tx.type === "credit" || tx.type === "escrow_release";
                        return (
                          <motion.div
                            key={tx.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/30 transition-colors"
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{tx.description}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={`font-semibold ${isCredit ? "text-green-600" : "text-red-500"}`}>
                                {isCredit ? "+" : "-"}${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </p>
                              <Badge className={`text-[10px] mt-0.5 capitalize border-0 ${tx.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                {tx.status}
                              </Badge>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
