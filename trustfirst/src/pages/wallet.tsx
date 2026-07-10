import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useProjects } from "@/hooks/use-projects";
import { useWallet, useWalletTransactions, useDeposit, useWithdraw } from "@/hooks/use-wallet";
import { api } from "@/lib/api";
import { DollarSign, Shield, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, Wallet, TrendingUp, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

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
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: transactions = [], isLoading: txLoading } = useWalletTransactions();
  const isLoading = walletLoading || txLoading;
  const isFreelancer = user?.role === "freelancer";
  const { toast } = useToast();
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [methodInput, setMethodInput] = useState("Credit Card");

  const deposit = useDeposit();
  const withdraw = useWithdraw();

  const [depositType, setDepositType] = useState<"mock" | "razorpay">("razorpay");
  const [showFundEscrowDialog, setShowFundEscrowDialog] = useState(false);
  const [selectedProjectForEscrow, setSelectedProjectForEscrow] = useState<any>(null);
  const [escrowFundingMethod, setEscrowFundingMethod] = useState<"wallet" | "razorpay">("wallet");
  const [isProcessingRazorpay, setIsProcessingRazorpay] = useState(false);

  useEffect(() => {
    const scriptId = "razorpay-checkout-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const qc = useQueryClient();
  const { projects = [] } = useProjects();
  const pendingProjects = projects.filter(p => p.status === "accepted");

  const [companyName, setCompanyName] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [billingState, setBillingState] = useState("");

  const { data: gstProfile, refetch: refetchGst } = useQuery<any>({
    queryKey: ["gst-profile"],
    queryFn: () => api.get("/gst-profile"),
  });

  const saveGst = useMutation({
    mutationFn: (data: any) => api.post("/gst-profile", data),
    onSuccess: () => {
      toast({ title: "GST Profile Updated!", description: "Your business billing details have been saved." });
      refetchGst();
    },
    onError: (err: any) => {
      toast({ title: "Failed to update profile", description: err.message, variant: "destructive" });
    }
  });

  useEffect(() => {
    if (gstProfile) {
      setCompanyName(gstProfile.companyName || "");
      setBillingAddress(gstProfile.billingAddress || "");
      setGstin(gstProfile.gstin || "");
      setIsRegistered(gstProfile.isRegistered || false);
      setBillingState(gstProfile.state || "");
    }
  }, [gstProfile]);

  const fundMutation = useMutation({
    mutationFn: ({ projectId, amount }: { projectId: number; amount: number }) =>
      api.post(`/projects/${projectId}/escrow/fund`, { amount }),
    onSuccess: () => {
      toast({ title: "Escrow funded successfully!", description: "Funds transferred to project escrow." });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["wallet", "transactions"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err: any) => {
      toast({ title: "Funding failed", description: err.message, variant: "destructive" });
    }
  });

  const handleRazorpayDeposit = async () => {
    setIsProcessingRazorpay(true);
    try {
      const order = (await api.post("/razorpay/create-order", {
        amount: Number(amountInput),
        type: "wallet_deposit",
      })) as any;

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Fintrust+",
        description: `Wallet Deposit: $${Number(amountInput).toLocaleString()} USD`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            await api.post("/razorpay/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            toast({
              title: "Funds added!",
              description: `$${Number(amountInput).toLocaleString()} was deposited into your wallet using Razorpay.`,
            });
            setShowAddFunds(false);
            qc.invalidateQueries({ queryKey: ["wallet"] });
            qc.invalidateQueries({ queryKey: ["wallet", "transactions"] });
          } catch (err: any) {
            toast({
              title: "Payment verification failed",
              description: err.message || "Could not verify payment.",
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: "#0f62fe",
        },
        modal: {
          ondismiss: function () {
            toast({
              title: "Payment Cancelled",
              description: "The payment process was cancelled.",
              variant: "destructive",
            });
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast({
        title: "Deposit initiation failed",
        description: err.message || "Failed to initialize Razorpay checkout",
        variant: "destructive",
      });
    } finally {
      setIsProcessingRazorpay(false);
    }
  };

  const handleRazorpayEscrowFunding = async (project: any) => {
    setIsProcessingRazorpay(true);
    try {
      const order = (await api.post("/razorpay/create-order", {
        amount: Number(project.budget),
        type: "escrow_funding",
        projectId: project.id,
      })) as any;

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Fintrust+",
        description: `Direct Escrow Funding: "${project.title}"`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            await api.post("/razorpay/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            toast({
              title: "Escrow funded!",
              description: `Escrow for project "${project.title}" was funded successfully via Razorpay.`,
            });
            setShowFundEscrowDialog(false);
            qc.invalidateQueries({ queryKey: ["wallet"] });
            qc.invalidateQueries({ queryKey: ["wallet", "transactions"] });
            qc.invalidateQueries({ queryKey: ["projects"] });
          } catch (err: any) {
            toast({
              title: "Payment verification failed",
              description: err.message || "Could not verify payment.",
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: "#0f62fe",
        },
        modal: {
          ondismiss: function () {
            toast({
              title: "Payment Cancelled",
              description: "The payment process was cancelled.",
              variant: "destructive",
            });
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast({
        title: "Funding initiation failed",
        description: err.message || "Failed to initialize Razorpay checkout",
        variant: "destructive",
      });
    } finally {
      setIsProcessingRazorpay(false);
    }
  };


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
                <Link href="/withdraw">
                  <Button
                    className="rounded-full bg-primary hover:bg-primary/90 gap-2"
                  >
                    <ArrowUpRight className="h-4 w-4" /> Withdraw Funds
                  </Button>
                </Link>
              ) : (
                <Button
                  className="rounded-full bg-primary hover:bg-primary/90 gap-2"
                  onClick={() => {
                    setAmountInput("");
                    setMethodInput("Credit Card");
                    setShowAddFunds(true);
                  }}
                >
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

              {!isFreelancer && pendingProjects.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-bold mb-4">Pending Escrow Funding</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {pendingProjects.map((p) => (
                      <Card key={p.id} className="border-blue-100 bg-blue-50/20">
                        <CardContent className="p-5 flex flex-col justify-between gap-3 h-full">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Escrow Required</span>
                              <span className="font-bold text-sm">${Number(p.budget).toLocaleString()}</span>
                            </div>
                            <h3 className="font-semibold text-sm leading-tight text-foreground">{p.title}</h3>
                          </div>
                          <Button
                            size="sm"
                            className="w-full rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs gap-1 mt-2"
                            disabled={fundMutation.isPending || isProcessingRazorpay}
                            onClick={() => {
                              setSelectedProjectForEscrow(p);
                              setEscrowFundingMethod(available >= Number(p.budget) ? "wallet" : "razorpay");
                              setShowFundEscrowDialog(true);
                            }}
                          >
                            {fundMutation.isPending && fundMutation.variables?.projectId === p.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Shield className="h-3 w-3" />
                            )}
                            Fund Escrow (${Number(p.budget).toLocaleString()})
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-8 flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-primary">Smart Escrow Protection</p>
                  <p className="text-xs text-muted-foreground">
                    {isFreelancer
                      ? `$${inEscrow.toLocaleString(undefined, { minimumFractionDigits: 2 })} is securely held by FinTrust+ and released when your milestones are approved.`
                      : `$${inEscrow.toLocaleString(undefined, { minimumFractionDigits: 2 })} is held in escrow, protecting both you and your freelancers.`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
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
                </div>

                <div>
                  <Card>
                    <CardContent className="p-6 space-y-4">
                      <div className="border-b pb-3">
                        <h2 className="font-semibold text-base flex items-center gap-2">
                          <Shield className="h-4.5 w-4.5 text-primary" /> GST & Billing Profile
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Configure tax information for invoices</p>
                      </div>

                      <div className="flex items-center justify-between py-1">
                        <span className="text-xs font-semibold text-foreground">Registered for GST</span>
                        <input
                          type="checkbox"
                          checked={isRegistered}
                          onChange={(e) => setIsRegistered(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        />
                      </div>

                      {isRegistered && (
                        <div className="space-y-3.5 pt-2 border-t border-dashed">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground">GSTIN (15 characters) *</label>
                            <Input
                              placeholder="e.g. 27AAAAA1111A1Z1"
                              value={gstin}
                              onChange={(e) => setGstin(e.target.value.toUpperCase().slice(0, 15))}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground">Registered Company Name *</label>
                            <Input
                              placeholder="e.g. Acme Corporation"
                              value={companyName}
                              onChange={(e) => setCompanyName(e.target.value)}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground">State *</label>
                            <select
                              className="w-full text-xs rounded-lg border bg-background p-2.5 outline-none focus:ring-1 focus:ring-primary"
                              value={billingState}
                              onChange={(e) => setBillingState(e.target.value)}
                            >
                              <option value="">-- Select state --</option>
                              {["Maharashtra", "Karnataka", "Delhi", "Tamil Nadu", "Telangana", "Gujarat", "Uttar Pradesh", "West Bengal", "Haryana"].map((st) => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5 pt-2">
                        <label className="text-xs font-semibold text-muted-foreground">Billing / Corporate Address *</label>
                        <textarea
                          className="w-full text-xs rounded-lg border bg-background p-2.5 outline-none focus:ring-1 focus:ring-primary min-h-[70px]"
                          placeholder="e.g. 101 Corporate Park, Mumbai, 400001"
                          value={billingAddress}
                          onChange={(e) => setBillingAddress(e.target.value)}
                        />
                      </div>

                      <Button
                        size="sm"
                        className="w-full rounded-full font-semibold mt-2"
                        disabled={saveGst.isPending}
                        onClick={() => {
                          if (isRegistered && (!gstin || gstin.trim().length !== 15)) {
                            toast({ title: "Validation Error", description: "GSTIN must be exactly 15 characters long.", variant: "destructive" });
                            return;
                          }
                          if (!billingAddress.trim()) {
                            toast({ title: "Validation Error", description: "Billing address is required.", variant: "destructive" });
                            return;
                          }
                          if (isRegistered && (!companyName.trim() || !billingState)) {
                            toast({ title: "Validation Error", description: "Company name and state are required for GST registered users.", variant: "destructive" });
                            return;
                          }
                          saveGst.mutate({
                            companyName: companyName.trim(),
                            billingAddress: billingAddress.trim(),
                            gstin: isRegistered ? gstin.trim() : "",
                            isRegistered,
                            state: billingState,
                          });
                        }}
                      >
                        {saveGst.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        Save Profile Details
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Add Funds Dialog */}
      <Dialog open={showAddFunds} onOpenChange={setShowAddFunds}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Add Funds
            </DialogTitle>
            <DialogDescription className="text-xs">
              Deposit funds into your wallet available balance using Razorpay or simulated mock payments.
            </DialogDescription>
          </DialogHeader>

          {/* Toggle Deposit Type */}
          <div className="flex gap-2 p-1 bg-secondary rounded-lg mb-3">
            <button
              type="button"
              className={`flex-1 text-xs py-1.5 rounded-md font-semibold transition-all ${
                depositType === "razorpay"
                  ? "bg-background shadow-sm text-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setDepositType("razorpay")}
            >
              Razorpay (Real/Test)
            </button>
            <button
              type="button"
              className={`flex-1 text-xs py-1.5 rounded-md font-semibold transition-all ${
                depositType === "mock"
                  ? "bg-background shadow-sm text-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setDepositType("mock")}
            >
              Mock Deposit
            </button>
          </div>

          <div className="grid gap-4 py-3">
            {depositType === "mock" && (
              <div className="space-y-1">
                <label className="text-xs font-semibold">Payment Method</label>
                <Input
                  placeholder="Credit Card, Bank Transfer, PayPal"
                  value={methodInput}
                  onChange={(e) => setMethodInput(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold">Amount ($) *</label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddFunds(false)}
              disabled={deposit.isPending || isProcessingRazorpay}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={
                deposit.isPending ||
                isProcessingRazorpay ||
                !amountInput ||
                isNaN(Number(amountInput)) ||
                Number(amountInput) <= 0
              }
              onClick={() => {
                if (depositType === "mock") {
                  deposit.mutate(
                    { amount: Number(amountInput), method: methodInput.trim() || "Mock Payment" },
                    {
                      onSuccess: () => {
                        toast({
                          title: "Funds added!",
                          description: `$${Number(amountInput).toLocaleString()} was mock-deposited into your wallet.`,
                        });
                        setShowAddFunds(false);
                      },
                      onError: (err: any) => {
                        toast({
                          title: "Failed to add funds",
                          description: err.message,
                          variant: "destructive",
                        });
                      },
                    }
                  );
                } else {
                  handleRazorpayDeposit();
                }
              }}
            >
              {deposit.isPending || isProcessingRazorpay ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : null}
              {depositType === "mock" ? "Confirm Mock Deposit" : "Pay with Razorpay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Funds Dialog */}
      <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-primary" />
              Withdraw Mock Funds
            </DialogTitle>
            <DialogDescription className="text-xs">
              Simulate withdrawing funds from your wallet available balance.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Withdrawal Method</label>
              <Input
                placeholder="Bank Transfer, PayPal"
                value={methodInput}
                onChange={(e) => setMethodInput(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Amount ($) * (Max: ${available.toLocaleString()})</label>
              <Input
                type="number"
                placeholder="e.g. 1000"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowWithdraw(false)} disabled={withdraw.isPending}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={withdraw.isPending || !amountInput || isNaN(Number(amountInput)) || Number(amountInput) <= 0 || Number(amountInput) > available}
              onClick={() => {
                withdraw.mutate(
                  { amount: Number(amountInput), method: methodInput.trim() || "Mock Withdrawal" },
                  {
                    onSuccess: () => {
                      toast({ title: "Funds withdrawn!", description: `$${Number(amountInput).toLocaleString()} was mock-withdrawn from your wallet.` });
                      setShowWithdraw(false);
                    },
                    onError: (err: any) => {
                      toast({ title: "Failed to withdraw funds", description: err.message, variant: "destructive" });
                    }
                  }
                );
              }}
            >
              {withdraw.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Confirm Mock Withdrawal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fund Project Escrow Dialog */}
      <Dialog open={showFundEscrowDialog} onOpenChange={setShowFundEscrowDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Fund Project Escrow
            </DialogTitle>
            <DialogDescription className="text-xs">
              Lock funds in escrow to start the project. Funds are protected and released upon milestone approval.
            </DialogDescription>
          </DialogHeader>

          {selectedProjectForEscrow && (
            <div className="space-y-4 py-3">
              <div className="p-3 bg-secondary rounded-xl text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project:</span>
                  <span className="font-semibold text-foreground text-right max-w-[200px] truncate">
                    {selectedProjectForEscrow.title}
                  </span>
                </div>
                <div className="flex justify-between border-t border-dashed pt-1.5 mt-1.5">
                  <span className="text-muted-foreground">Required Escrow:</span>
                  <span className="font-bold text-foreground">
                    ${Number(selectedProjectForEscrow.budget).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your Wallet Balance:</span>
                  <span className="font-semibold text-foreground">
                    ${Number(available).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Funding Method Toggle */}
              <div className="space-y-2">
                <label className="text-xs font-semibold">Select Payment Method</label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    disabled={available < Number(selectedProjectForEscrow.budget)}
                    className={`flex items-center justify-between p-3 border rounded-xl text-left transition-all ${
                      escrowFundingMethod === "wallet"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-foreground hover:bg-secondary/30"
                    } ${available < Number(selectedProjectForEscrow.budget) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    onClick={() => setEscrowFundingMethod("wallet")}
                  >
                    <div>
                      <p className="text-xs font-semibold">Available Wallet Balance</p>
                      <p className="text-[10px] text-muted-foreground">
                        Pay from your current available funds (${Number(available).toLocaleString()})
                      </p>
                    </div>
                    {available < Number(selectedProjectForEscrow.budget) && (
                      <Badge className="text-[10px] bg-red-100 text-red-700 hover:bg-red-100 border-0">
                        Insufficient
                      </Badge>
                    )}
                  </button>

                  <button
                    type="button"
                    className={`flex items-center justify-between p-3 border rounded-xl text-left transition-all cursor-pointer ${
                      escrowFundingMethod === "razorpay"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-foreground hover:bg-secondary/30"
                    }`}
                    onClick={() => setEscrowFundingMethod("razorpay")}
                  >
                    <div>
                      <p className="text-xs font-semibold">Razorpay Checkout</p>
                      <p className="text-[10px] text-muted-foreground">
                        Pay directly using Credit/Debit Card, UPI, Netbanking, etc.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFundEscrowDialog(false)}
              disabled={fundMutation.isPending || isProcessingRazorpay}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={fundMutation.isPending || isProcessingRazorpay || !selectedProjectForEscrow}
              onClick={() => {
                if (escrowFundingMethod === "wallet") {
                  fundMutation.mutate(
                    {
                      projectId: selectedProjectForEscrow.id,
                      amount: Number(selectedProjectForEscrow.budget),
                    },
                    {
                      onSuccess: () => {
                        setShowFundEscrowDialog(false);
                      },
                    }
                  );
                } else {
                  handleRazorpayEscrowFunding(selectedProjectForEscrow);
                }
              }}
            >
              {fundMutation.isPending || isProcessingRazorpay ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : null}
              {escrowFundingMethod === "wallet" ? "Pay from Wallet" : "Pay with Razorpay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
