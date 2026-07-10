import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KeyRound, Loader2, Check, X, ArrowLeft } from "lucide-react";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [email] = useState(() => sessionStorage.getItem("reset_password_email") || "");
  const [otp] = useState(() => sessionStorage.getItem("reset_password_otp") || "");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // If no auth context exists, send back to forgot password start
  useEffect(() => {
    if (!email || !otp) {
      toast({ title: "Session Expired", description: "Verification context missing. Please start password recovery again.", variant: "destructive" });
      setLocation("/forgot-password");
    }
  }, [email, otp, setLocation, toast]);

  // Password criteria indicators
  const criteria = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const isStrengthValid = Object.values(criteria).every(Boolean);
  const passwordsMatch = password && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStrengthValid) {
      toast({ title: "Weak Password", description: "Please fulfill all password security criteria.", variant: "destructive" });
      return;
    }
    if (!passwordsMatch) {
      toast({ title: "Password Mismatch", description: "Passwords do not match.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { email, otp, password });
      toast({ title: "Success", description: "Password Changed Successfully!" });
      
      // Clear sessions
      sessionStorage.removeItem("reset_password_email");
      sessionStorage.removeItem("reset_password_otp");
      
      setLocation("/login");
    } catch (err: any) {
      toast({ title: "Reset Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
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
              <KeyRound className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800">Choose New Password</CardTitle>
            <CardDescription className="text-slate-500">
              Create a strong password to protect your account.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-5 pt-2 pb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 block">New Password</label>
                <Input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 rounded-2xl border-slate-200 focus-visible:ring-blue-500"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 block">Confirm Password</label>
                <Input 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 rounded-2xl border-slate-200 focus-visible:ring-blue-500"
                  disabled={loading}
                />
              </div>

              {/* Password strength criteria checklist */}
              <div className="p-3 bg-slate-50 rounded-2xl border space-y-1.5 text-xs text-slate-600">
                <div className="font-semibold text-slate-700 mb-1">Security Requirements:</div>
                <div className="flex items-center gap-1.5">
                  {criteria.length ? <Check className="h-3.5 w-3.5 text-green-600" /> : <X className="h-3.5 w-3.5 text-slate-300" />}
                  <span className={criteria.length ? "text-green-700" : ""}>At least 8 characters long</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {criteria.uppercase ? <Check className="h-3.5 w-3.5 text-green-600" /> : <X className="h-3.5 w-3.5 text-slate-300" />}
                  <span className={criteria.uppercase ? "text-green-700" : ""}>One uppercase letter (A-Z)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {criteria.lowercase ? <Check className="h-3.5 w-3.5 text-green-600" /> : <X className="h-3.5 w-3.5 text-slate-300" />}
                  <span className={criteria.lowercase ? "text-green-700" : ""}>One lowercase letter (a-z)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {criteria.number ? <Check className="h-3.5 w-3.5 text-green-600" /> : <X className="h-3.5 w-3.5 text-slate-300" />}
                  <span className={criteria.number ? "text-green-700" : ""}>One numeric digit (0-9)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {criteria.special ? <Check className="h-3.5 w-3.5 text-green-600" /> : <X className="h-3.5 w-3.5 text-slate-300" />}
                  <span className={criteria.special ? "text-green-700" : ""}>One special character (e.g. @, #, $, %)</span>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-600/10"
                disabled={loading || !isStrengthValid || !passwordsMatch}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Reset Password
              </Button>
            </form>

            <div className="flex flex-col items-center pt-2 border-t text-xs">
              <button 
                onClick={() => {
                  sessionStorage.removeItem("reset_password_email");
                  sessionStorage.removeItem("reset_password_otp");
                  setLocation("/login");
                }}
                className="text-slate-400 hover:text-slate-600 flex items-center gap-1"
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
