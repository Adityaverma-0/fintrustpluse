import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Loader2, RefreshCw, ArrowLeft, ShieldCheck } from "lucide-react";

export default function VerifyResetOtpPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [email, setEmail] = useState(() => {
    const saved = sessionStorage.getItem("reset_password_email");
    if (saved) return saved;
    const params = new URLSearchParams(window.location.search);
    return params.get("email") || "";
  });

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const handleRevealDevOtp = async () => {
    try {
      const res = await api.get<any>(`/auth/dev-otp?email=${encodeURIComponent(email)}`);
      const code = res.resetPasswordOtp;
      if (code) {
        setDevOtp(code);
        setOtp(code);
        toast({ title: "Developer Helper", description: `OTP Revealed & Autofilled: ${code}` });
      } else {
        toast({ title: "No OTP Found", description: "Could not find active password reset OTP for this email.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Failed to Fetch OTP", description: err.message, variant: "destructive" });
    }
  };

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Email Missing", description: "Email context is lost. Please start recovery again.", variant: "destructive" });
      return;
    }
    if (otp.trim().length !== 6) {
      toast({ title: "Invalid Code", description: "OTP must be exactly 6 digits.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<any>("/auth/verify-reset-otp", { email, otp: otp.trim() });
      toast({ title: "OTP Verified", description: res.message });
      
      // Store the verified OTP to authorize password reset
      sessionStorage.setItem("reset_password_otp", otp.trim());
      
      // Redirect to change password page
      setLocation("/reset-password");
    } catch (err: any) {
      toast({ title: "Validation Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending || !email) return;

    setResending(true);
    try {
      await api.post("/auth/forgot-password", { email });
      toast({ title: "OTP Resent", description: "A new 6-digit verification code has been sent to your email." });
      setCooldown(60);
    } catch (err: any) {
      toast({ title: "Resend Failed", description: err.message, variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="border-slate-100 shadow-xl bg-white rounded-3xl overflow-hidden">
          <div className="h-2 bg-blue-600"></div>
          <CardHeader className="space-y-2 text-center pt-8">
            <div className="mx-auto w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-2">
              <Lock className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800">Verify Reset OTP</CardTitle>
            <CardDescription className="text-slate-500">
              Please enter the 6-digit reset code sent to <br />
              <strong className="text-slate-800 font-medium">{email || "your email"}</strong>
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-2 pb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 block text-center">Verification Code</label>
                <Input 
                  ref={inputRef}
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="0 0 0 0 0 0"
                  className="h-14 text-center text-2xl font-bold tracking-[8px] rounded-2xl border-slate-200 focus-visible:ring-blue-500"
                  disabled={loading}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-600/10"
                disabled={loading || otp.length !== 6}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                Verify Code & Continue
              </Button>
            </form>

            <div className="flex flex-col items-center gap-2 pt-2 border-t text-xs">
              <button 
                type="button"
                onClick={handleRevealDevOtp}
                className="text-amber-600 hover:text-amber-700 font-semibold mb-2 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200"
              >
                Dev Helper: Reveal & Autofill OTP
              </button>

              <button 
                onClick={handleResend}
                disabled={cooldown > 0 || resending}
                className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {cooldown > 0 ? `Resend Code in ${cooldown}s` : "Resend Verification Code"}
              </button>

              <button 
                onClick={() => {
                  sessionStorage.removeItem("reset_password_email");
                  sessionStorage.removeItem("reset_password_otp");
                  setLocation("/login");
                }}
                className="text-slate-400 hover:text-slate-600 mt-2 flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" /> Cancel & Back to Login
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
