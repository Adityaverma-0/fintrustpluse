import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Key, Loader2, ArrowLeft, Send } from "lucide-react";

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Email Required", description: "Please enter your email address to continue.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      toast({ title: "Verification Code Sent", description: "A 6-digit OTP code has been dispatched to your email address." });
      
      // Store in sessionStorage to share email context with OTP verification page
      sessionStorage.setItem("reset_password_email", email.trim());
      
      // Redirect to OTP verification page
      setLocation("/verify-reset-otp");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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
              <Key className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800">Forgot Password?</CardTitle>
            <CardDescription className="text-slate-500">
              No worries! Enter your registered email and we'll send you a 6-digit verification code to reset it.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-2 pb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 block">Email Address</label>
                <Input 
                  ref={inputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="h-12 rounded-2xl border-slate-200 focus-visible:ring-blue-500"
                  disabled={loading}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-600/10"
                disabled={loading || !email}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Send Verification Code
              </Button>
            </form>

            <div className="flex flex-col items-center pt-2 border-t text-xs">
              <button 
                onClick={() => setLocation("/login")}
                className="text-slate-400 hover:text-slate-600 flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" /> Back to Login
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
