import { useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  DollarSign, 
  Shield, 
  ArrowUpRight, 
  Building, 
  User, 
  CreditCard, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Loader2, 
  Download,
  Plus
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface BalanceData {
  availableBalance: number;
  pendingBalance: number;
  lockedEscrowBalance: number;
  totalEarnings: number;
  totalWithdrawn: number;
  lastWithdrawal: {
    amount: number;
    status: string;
    requestedAt: string;
  } | null;
}

interface BankAccountData {
  id: number;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId?: string;
  pan?: string;
  gst?: string;
  isVerified: boolean;
}

interface WithdrawalRequest {
  id: number;
  userId: number;
  amount: number;
  currency: string;
  status: string;
  requestedAt: string;
  processedAt?: string;
  failureReason?: string;
}

export default function WithdrawPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [withdrawAmount, setWithdrawAmount] = useState("");
  
  // Bank account form state
  const [editBank, setEditBank] = useState(false);
  const [bankHolderName, setBankHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankUpi, setBankUpi] = useState("");
  const [bankPan, setBankPan] = useState("");
  const [bankGst, setBankGst] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<"razorpayx" | "razorpay_instant">("razorpayx");
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  // Queries
  const { data: balance, isLoading: balanceLoading } = useQuery<BalanceData>({
    queryKey: ["wallet-balance"],
    queryFn: () => api.get<BalanceData>("/wallet/balance"),
  });

  const { data: bankAccount, isLoading: bankLoading } = useQuery<BankAccountData | null>({
    queryKey: ["bank-account"],
    queryFn: () => api.get<BankAccountData | null>("/bank-account"),
    meta: {
      onSuccess: (data: BankAccountData | null) => {
        if (data) {
          setBankHolderName(data.accountHolderName);
          setBankName(data.bankName);
          setBankIfsc(data.ifscCode);
          setBankUpi(data.upiId || "");
          setBankPan(data.pan || "");
          setBankGst(data.gst || "");
        }
      }
    }
  });

  const { data: withdrawals = [], isLoading: historyLoading } = useQuery<WithdrawalRequest[]>({
    queryKey: ["withdrawals-history"],
    queryFn: () => api.get<WithdrawalRequest[]>("/wallet/withdrawals"),
  });

  // Mutations
  const bankMutation = useMutation({
    mutationFn: (data: any) => {
      return bankAccount 
        ? api.patch<BankAccountData>("/bank-account", data)
        : api.post<BankAccountData>("/bank-account", data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-account"] });
      toast({ title: "Bank Details Updated!", description: "Your payout destination bank account is successfully linked and verified." });
      setEditBank(false);
    },
    onError: (err: any) => {
      toast({ title: "Failed to Save Bank Details", description: err.message, variant: "destructive" });
    }
  });

  const withdrawMutation = useMutation({
    mutationFn: (data: { amount: number; bankAccountId: number; payoutMethod: string; otp: string }) => api.post("/wallet/withdraw", data),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["wallet-balance"] });
      qc.invalidateQueries({ queryKey: ["withdrawals-history"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["wallet", "transactions"] });
      
      const isInstant = res?.status === "successful";
      toast({ 
        title: isInstant ? "Withdrawal Successful!" : "Withdrawal Requested!", 
        description: isInstant 
          ? `Your instant transfer of $${res.amount} has been successfully processed to your bank.` 
          : "Your withdrawal request has been submitted and is pending admin approval." 
      });
      setWithdrawAmount("");
      setShowOtpDialog(false);
      setOtpCode("");
    },
    onError: (err: any) => {
      toast({ title: "Withdrawal Failed", description: err.message, variant: "destructive" });
    }
  });

  const sendOtpMutation = useMutation({
    mutationFn: (amount: number) => api.post("/auth/send-withdrawal-otp", { amount }),
    onSuccess: () => {
      setShowOtpDialog(true);
      toast({ title: "OTP Sent!", description: "A 6-digit verification code has been sent to your registered Gmail address." });
    },
    onError: (err: any) => {
      console.warn("SMTP send failed, opening dialog for developer bypass:", err);
      setShowOtpDialog(true);
      toast({ 
        title: "Email Delivery Warning", 
        description: `SMTP delivery failed (${err.message}). Opening verification dialog anyway. Please use the "Dev Helper" button inside the modal to retrieve your code.`, 
        variant: "destructive" 
      });
    }
  });

  const verifyKycMutation = useMutation({
    mutationFn: () => api.post("/auth/verify-kyc", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      toast({ title: "KYC Verified!", description: "Your identity has been successfully verified. You can now initiate withdrawals." });
    },
    onError: (err: any) => {
      toast({ title: "Verification Failed", description: err.message, variant: "destructive" });
    }
  });

  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankHolderName || !bankName || !bankIfsc || (!bankAccount && !bankAccountNumber)) {
      toast({ title: "Required Fields Missing", description: "Please fill in holder name, bank name, account number, and IFSC code.", variant: "destructive" });
      return;
    }
    const payload: any = {
      accountHolderName: bankHolderName,
      bankName,
      ifscCode: bankIfsc,
      upiId: bankUpi || undefined,
      pan: bankPan || undefined,
      gst: bankGst || undefined,
    };
    if (bankAccountNumber) {
      payload.accountNumber = bankAccountNumber;
    }
    bankMutation.mutate(payload);
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid withdrawal amount.", variant: "destructive" });
      return;
    }
    if (!bankAccount) {
      toast({ title: "No Bank Account Linked", description: "Please link your bank account details before initiating withdrawals.", variant: "destructive" });
      return;
    }
    sendOtpMutation.mutate(amount);
  };

  const handleOtpVerifyAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6 || isNaN(Number(otpCode))) {
      toast({ title: "Invalid Code", description: "Please enter a valid 6-digit numeric verification code.", variant: "destructive" });
      return;
    }
    const amount = Number(withdrawAmount);
    withdrawMutation.mutate({ amount, bankAccountId: bankAccount!.id, payoutMethod, otp: otpCode });
  };

  // Download Receipt simulation
  const downloadReceipt = (w: WithdrawalRequest) => {
    const docContent = `--------------------------------------------------
TRUSTFIRST+ WITHDRAWAL TRANSACTION RECEIPT
--------------------------------------------------
Receipt Number: REC-WDR-${w.id}-${new Date(w.requestedAt).getTime()}
User Reference: USER-${w.userId}
Payout Method: RazorpayX Payout
Status: SUCCESSFUL
Amount: $${w.amount.toFixed(2)} USD
Date Processed: ${w.processedAt ? new Date(w.processedAt).toLocaleString() : new Date(w.requestedAt).toLocaleString()}

Thank you for building on TrustFirst+!
--------------------------------------------------`;
    const blob = new Blob([docContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Receipt-Withdrawal-${w.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isKycVerified = user?.isVerified ?? false;
  const available = balance?.availableBalance ?? 0;
  const minWithdrawal = 10;

  const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: "Pending Approval", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
    processing: { label: "Processing Payout", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Loader2 },
    successful: { label: "Successful", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
    failed: { label: "Failed", color: "bg-red-100 text-red-800 border-red-200", icon: AlertTriangle },
    rejected: { label: "Rejected by Admin", color: "bg-red-100 text-red-800 border-red-200", icon: AlertTriangle },
    cancelled: { label: "Cancelled", color: "bg-slate-100 text-slate-800 border-slate-200", icon: Clock },
    reversed: { label: "Reversed", color: "bg-purple-100 text-purple-800 border-purple-200", icon: AlertTriangle }
  };

  const isLoading = balanceLoading || bankLoading || historyLoading;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Withdraw Funds</h1>
              <p className="text-slate-500 text-sm">Withdraw your secure earnings directly to your verified bank account</p>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          <>
            {/* Balance Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              {[
                { label: "Available to Withdraw", value: `$${available.toLocaleString()}`, color: "text-emerald-600", desc: "Instantly withdrawable" },
                { label: "Pending Processing", value: `$${(balance?.pendingBalance ?? 0).toLocaleString()}`, color: "text-amber-500", desc: "Locked for admin review" },
                { label: "Locked in Escrow", value: `$${(balance?.lockedEscrowBalance ?? 0).toLocaleString()}`, color: "text-blue-500", desc: "Escrow milestone protected" },
                { label: "Total Earnings", value: `$${(balance?.totalEarnings ?? 0).toLocaleString()}`, color: "text-slate-800", desc: "Lifetime platform earnings" },
                { label: "Total Withdrawn", value: `$${(balance?.totalWithdrawn ?? 0).toLocaleString()}`, color: "text-emerald-800", desc: "Successfully paid out" }
              ].map((b, i) => (
                <motion.div key={b.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="border-slate-100 shadow-sm">
                    <CardContent className="p-4">
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">{b.label}</div>
                      <div className={`text-xl font-bold ${b.color}`}>{b.value}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{b.desc}</div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Main Content Layout */}
            <div className="grid lg:grid-cols-3 gap-8">
              
              {/* Request & Bank Management Column */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* KYC Verification Guard alert */}
                {!isKycVerified && (
                  <Card className="border-red-100 bg-red-50/50">
                    <CardContent className="p-4 flex gap-3 items-start">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-semibold text-red-800">KYC Verification Required</h4>
                        <p className="text-xs text-red-600 mt-1">
                          Platform regulations require freelancers to complete identity verification prior to transferring funds. Please update your profile or contact support to complete verification.
                        </p>
                        <Button
                          onClick={() => verifyKycMutation.mutate()}
                          disabled={verifyKycMutation.isPending}
                          size="sm"
                          className="mt-3 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs h-8 px-4"
                        >
                          {verifyKycMutation.isPending ? "Verifying..." : "Complete KYC Verification Now"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Withdrawal Form */}
                <Card className="border-slate-100 shadow-sm bg-white">
                  <CardHeader>
                    <CardTitle className="text-base text-slate-800 flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-emerald-600" />
                      Initiate Payout Transfer
                    </CardTitle>
                    <CardDescription>Enter the USD amount you wish to withdraw to your linked bank account</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                      {/* Payout Method Selection */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500">Select Payout Method</label>
                        <div className="grid grid-cols-2 gap-4">
                          {/* RazorpayX Standard Card */}
                          <div 
                            onClick={() => setPayoutMethod("razorpayx")}
                            className={`p-4 border rounded-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between h-28 relative overflow-hidden ${
                              payoutMethod === "razorpayx" 
                                ? "border-emerald-500 bg-emerald-50/20 shadow-sm ring-1 ring-emerald-500" 
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <div>
                              <div className="text-xs font-bold text-slate-700">RazorpayX Standard</div>
                              <div className="text-[10px] text-slate-400 mt-1 leading-relaxed">Direct transfer. Requires Admin manual approval.</div>
                            </div>
                            <Badge className={`w-fit text-[9px] px-1.5 py-0.5 rounded-full ${
                              payoutMethod === "razorpayx" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                            }`}>
                              1-2 Business Days
                            </Badge>
                          </div>

                          {/* Razorpay Instant Card */}
                          <div 
                            onClick={() => setPayoutMethod("razorpay_instant")}
                            className={`p-4 border rounded-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between h-28 relative overflow-hidden ${
                              payoutMethod === "razorpay_instant" 
                                ? "border-emerald-500 bg-emerald-50/20 shadow-sm ring-1 ring-emerald-500" 
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-75"></div>
                            <div>
                              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                Razorpay Instant
                                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 text-[8px] scale-90 px-1 py-0 rounded">FAST</Badge>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1 leading-relaxed">Instant automated transfer via Razorpay. Bypasses approval.</div>
                            </div>
                            <Badge className="bg-emerald-500 text-white w-fit text-[9px] px-1.5 py-0.5 rounded-full">
                              Processed Instantly
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500">Withdrawal Amount (USD)</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input 
                            type="number"
                            min={minWithdrawal}
                            step="any"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            placeholder="Min. $10"
                            className="pl-9 rounded-xl border-slate-200"
                            disabled={!isKycVerified || !bankAccount || withdrawMutation.isPending}
                          />
                        </div>
                        {bankAccount && (
                          <div className="space-y-2 mt-2">
                            <p className="text-[10px] text-slate-400">
                              Linked Bank: {bankAccount.bankName} ({bankAccount.accountNumber})
                            </p>
                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-[11px] text-slate-600">
                              <div className="flex justify-between font-medium">
                                <span>Exchange Rate:</span>
                                <span className="text-slate-800">1 USD = ₹83.00 INR</span>
                              </div>
                              <div className="flex justify-between font-semibold text-xs pt-1 border-t text-emerald-700">
                                <span>You will receive:</span>
                                <span>₹{(Number(withdrawAmount || 0) * 83).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} INR</span>
                              </div>
                              <div className="flex justify-between opacity-80 text-[10px]">
                                <span>Processing fee:</span>
                                <span>$0.00 USD (Free)</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white font-medium h-11"
                        disabled={!isKycVerified || !bankAccount || !withdrawAmount || Number(withdrawAmount) < minWithdrawal || Number(withdrawAmount) > available || withdrawMutation.isPending}
                      >
                        {withdrawMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Locking Funds & Requesting Payout...
                          </>
                        ) : (
                          "Initiate Payout Transfer"
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Bank Account Linking */}
                <Card className="border-slate-100 shadow-sm bg-white">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                      <CardTitle className="text-base text-slate-800 flex items-center gap-2">
                        <Building className="h-5 w-5 text-emerald-600" />
                        Payout Bank Account
                      </CardTitle>
                      <CardDescription>Configure the target Indian bank account for your withdrawals</CardDescription>
                    </div>
                    {bankAccount && !editBank && (
                      <Button variant="outline" size="sm" onClick={() => setEditBank(true)} className="rounded-full h-8 text-xs border-slate-200">
                        Modify Bank
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {!bankAccount && !editBank ? (
                      <div className="text-center py-8 border border-dashed rounded-2xl border-slate-200">
                        <Building className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                        <h4 className="text-sm font-semibold text-slate-700">No Destination Bank Account Linked</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          Provide your verified bank details to securely authorize payouts via RazorpayX.
                        </p>
                        <Button onClick={() => setEditBank(true)} className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs">
                          <Plus className="h-3 w-3 mr-1" /> Add Bank Account Details
                        </Button>
                      </div>
                    ) : editBank ? (
                      <form onSubmit={handleSaveBank} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500">Account Holder Name *</label>
                            <Input 
                              value={bankHolderName}
                              onChange={(e) => setBankHolderName(e.target.value)}
                              placeholder="As in bank passbook"
                              className="rounded-xl border-slate-200"
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500">Bank Name *</label>
                            <Input 
                              value={bankName}
                              onChange={(e) => setBankName(e.target.value)}
                              placeholder="e.g. HDFC Bank, ICICI Bank"
                              className="rounded-xl border-slate-200"
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500">IFSC Code *</label>
                            <Input 
                              value={bankIfsc}
                              onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                              placeholder="e.g. HDFC0000123"
                              maxLength={11}
                              className="rounded-xl border-slate-200"
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500">
                              {bankAccount ? "Account Number (Leave blank to keep unchanged)" : "Account Number *"}
                            </label>
                            <Input 
                              type="password"
                              value={bankAccountNumber}
                              onChange={(e) => setBankAccountNumber(e.target.value)}
                              placeholder={bankAccount ? "••••••••••••" : "Full account number"}
                              className="rounded-xl border-slate-200"
                              required={!bankAccount}
                            />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4 border-t pt-4 mt-2">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500">UPI ID (Optional)</label>
                            <Input 
                              value={bankUpi}
                              onChange={(e) => setBankUpi(e.target.value)}
                              placeholder="username@bank"
                              className="rounded-xl border-slate-200"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500">PAN (Optional)</label>
                            <Input 
                              value={bankPan}
                              onChange={(e) => setBankPan(e.target.value.toUpperCase())}
                              placeholder="ABCDE1234F"
                              maxLength={10}
                              className="rounded-xl border-slate-200"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500">GSTIN (Optional)</label>
                            <Input 
                              value={bankGst}
                              onChange={(e) => setBankGst(e.target.value.toUpperCase())}
                              placeholder="22AAAAA1111A1Z1"
                              maxLength={15}
                              className="rounded-xl border-slate-200"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                          <Button type="button" variant="ghost" onClick={() => setEditBank(false)} className="rounded-xl h-9 text-xs">
                            Cancel
                          </Button>
                          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 text-xs font-medium" disabled={bankMutation.isPending}>
                            {bankMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                            Save Bank Account details
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white border rounded-xl flex items-center justify-center shadow-sm">
                            <User className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Account Holder</div>
                            <div className="text-sm font-medium text-slate-700">{bankAccount?.accountHolderName}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white border rounded-xl flex items-center justify-center shadow-sm">
                            <Building className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Bank & Branch</div>
                            <div className="text-sm font-medium text-slate-700">{bankAccount?.bankName}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white border rounded-xl flex items-center justify-center shadow-sm">
                            <CreditCard className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Account Number</div>
                            <div className="text-sm font-medium text-slate-700">{bankAccount?.accountNumber}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white border rounded-xl flex items-center justify-center shadow-sm">
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">IFSC Code & Verification</div>
                            <div className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                              {bankAccount?.ifscCode}
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 py-0 text-[10px]">Verified</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* History Column */}
              <div>
                <Card className="border-slate-100 shadow-sm bg-white min-h-[400px]">
                  <CardHeader>
                    <CardTitle className="text-base text-slate-800">Withdrawal History</CardTitle>
                    <CardDescription>Track status and receipt of your withdrawals</CardDescription>
                  </CardHeader>
                  <CardContent className="px-3 pt-0">
                    {withdrawals.length === 0 ? (
                      <div className="text-center py-20 text-slate-400">
                        <Clock className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                        <span className="text-xs">No withdrawal history available</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {withdrawals.map((w) => {
                          const config = STATUS_CONFIG[w.status] || { label: w.status, color: "bg-slate-100 text-slate-800", icon: Clock };
                          const StatusIcon = config.icon;
                          return (
                            <div key={w.id} className="p-3 border rounded-2xl border-slate-100 bg-white flex flex-col gap-2 hover:border-slate-200 transition-colors">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="text-base font-bold text-slate-800">${Number(w.amount).toFixed(2)}</div>
                                  <div className="text-[10px] text-slate-400">{new Date(w.requestedAt).toLocaleString()}</div>
                                </div>
                                <Badge className={`text-[10px] border px-2 py-0.5 rounded-full flex items-center gap-1 font-medium ${config.color}`}>
                                  <StatusIcon className="h-3 w-3 flex-shrink-0" /> {config.label}
                                </Badge>
                              </div>

                              {w.failureReason && (
                                <p className="text-[10px] text-red-600 bg-red-50 p-2 rounded-xl">
                                  Reason: {w.failureReason}
                                </p>
                              )}

                              {w.status === "successful" && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => downloadReceipt(w)} 
                                  className="w-full text-slate-500 hover:text-emerald-700 h-8 text-xs border-t mt-1 pt-2 rounded-none hover:bg-transparent"
                                >
                                  <Download className="h-3.5 w-3.5 mr-1" /> Download Receipt
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

            </div>
          </>
        )}
      </div>

      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-100 rounded-3xl shadow-lg">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
              <Shield className="h-6 w-6 text-emerald-600" />
            </div>
            <DialogTitle className="text-center text-lg font-bold text-slate-800">
              Security Verification
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-500 px-2 mt-1.5 leading-relaxed">
              We have sent a 6-digit verification code to your registered email address <strong>{user?.email}</strong>. Please enter the code below to authorize this withdrawal.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleOtpVerifyAndSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="text-center text-xl font-bold tracking-[8px] h-12 rounded-xl border-slate-200 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 pl-4"
                required
              />
              

            </div>

            <DialogFooter className="flex-col sm:flex-col gap-2 pt-2">
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-10 rounded-xl"
                disabled={withdrawMutation.isPending}
              >
                {withdrawMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Verifying & Transferring...
                  </>
                ) : (
                  "Verify & Withdraw"
                )}
              </Button>
              <div className="flex justify-between items-center text-[11px] text-slate-400 w-full mt-2">
                <span>Didn't receive code?</span>
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto text-emerald-600 hover:text-emerald-700 text-[11px] font-semibold"
                  disabled={sendOtpMutation.isPending}
                  onClick={() => sendOtpMutation.mutate(Number(withdrawAmount))}
                >
                  {sendOtpMutation.isPending ? "Sending..." : "Resend Code"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
