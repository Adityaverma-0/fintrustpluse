import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, Zap, Shield, Lock } from "lucide-react";

const GOLD     = "#2D5A1E";
const GOLD_DIM = "#4A8030";
const WHITE    = "#FFFFFF";

export default function Login() {
  const [, navigate] = useLocation();
  const { user, login } = useAuth();
  const { toast } = useToast();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);

  if (user) {
    const role = user.role;
    navigate(
      role === "admin"  ? "/dashboard/admin"      :
      role === "client" ? "/dashboard/client"     :
                          "/dashboard/freelancer"
    );
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      login(data.token, data.user);
      toast({ title: "🏆 Quest Complete!", description: `Welcome back, ${data.user.name}!` });
      const role = data.user.role;
      navigate(
        role === "admin"  ? "/dashboard/admin"  :
        role === "client" ? "/dashboard/client" :
                            "/dashboard/freelancer"
      );
    } catch (err: any) {
      toast({ title: "❌ Login Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative"
      style={{ background: "#000" }}
    >
      {/* ── Looping video background ── */}
      <video
        autoPlay loop muted playsInline
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover", opacity: 0.7, zIndex: 0,
        }}
      >
        <source src="/login-bg.mp4" type="video/mp4" />
      </video>

      {/* ── Vignette overlay ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: "radial-gradient(ellipse at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 100%)",
      }} />

      {/* ── Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.94 }}
        animate={{ opacity: 1, y: 0,  scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative"
        style={{ zIndex: 2 }}
      >
        {/* Liquid Glass shell */}
        <div style={{
          borderRadius: 28,
          overflow: "hidden",
          /* glass fill */
          background: "linear-gradient(160deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 100%)",
          backdropFilter:         "blur(28px) saturate(180%) brightness(1.08)",
          WebkitBackdropFilter:   "blur(28px) saturate(180%) brightness(1.08)",
          /* border */
          border: "1px solid rgba(255,255,255,0.35)",
          /* depth shadows + inner glow */
          boxShadow: [
            "0 2px 0 0 rgba(255,255,255,0.55) inset",   /* top specular edge   */
            "0 -1px 0 0 rgba(255,255,255,0.12) inset",  /* bottom soft edge    */
            "1px 0 0 0 rgba(255,255,255,0.18) inset",   /* left specular edge  */
            "-1px 0 0 0 rgba(255,255,255,0.10) inset",  /* right soft edge     */
            "0 32px 80px rgba(0,0,0,0.55)",             /* outer drop shadow   */
            "0 8px 24px rgba(0,0,0,0.35)",              /* mid shadow          */
          ].join(", "),
          position: "relative",
        }}>

          {/* ── Inner refraction shimmer (top highlight blob) ── */}
          <div style={{
            pointerEvents: "none",
            position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)",
            width: "80%", height: 120,
            background: "radial-gradient(ellipse, rgba(255,255,255,0.28) 0%, transparent 70%)",
            filter: "blur(18px)",
            zIndex: 0,
          }} />

          {/* ── Logo + header ── */}
          <div style={{
            position: "relative", zIndex: 1,
            background: "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 100%)",
            borderBottom: "1px solid rgba(255,255,255,0.20)",
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "28px 28px 18px",
          }}>
            <motion.img
              src="/logo-nobg.png"
              alt="TrustFirst+ Logo"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.18 }}
              style={{ width: 180, height: 180, objectFit: "contain",
                filter: "brightness(0) invert(1) drop-shadow(0 4px 16px rgba(0,0,0,0.35))" }}
            />
            <h2 className="text-2xl font-extrabold mt-1"
                style={{ color: WHITE, textShadow: "0 1px 12px rgba(0,0,0,0.4)" }}>
              Welcome back
            </h2>
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} style={{ position: "relative", zIndex: 1, padding: "28px 28px 20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Email */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: "rgba(255,255,255,0.70)",
                }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="hero@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="glass-input"
                  style={{
                    height: 48, borderRadius: 14, outline: "none",
                    background: email
                      ? "rgba(255,255,255,0.18)"
                      : "rgba(255,255,255,0.10)",
                    border: email
                      ? "1px solid rgba(255,255,255,0.55)"
                      : "1px solid rgba(255,255,255,0.22)",
                    color: WHITE, padding: "0 16px", fontSize: 15, fontWeight: 500,
                    backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                    boxShadow: email
                      ? "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 3px rgba(255,255,255,0.08)"
                      : "inset 0 1px 0 rgba(255,255,255,0.18)",
                    transition: "all 0.25s",
                    width: "100%", boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: "rgba(255,255,255,0.70)",
                }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="glass-input"
                    style={{
                      height: 48, borderRadius: 14, outline: "none",
                      background: password
                        ? "rgba(255,255,255,0.18)"
                        : "rgba(255,255,255,0.10)",
                      border: password
                        ? "1px solid rgba(255,255,255,0.55)"
                        : "1px solid rgba(255,255,255,0.22)",
                      color: WHITE, padding: "0 48px 0 16px", fontSize: 15, fontWeight: 500,
                      backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                      boxShadow: password
                        ? "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 3px rgba(255,255,255,0.08)"
                        : "inset 0 1px 0 rgba(255,255,255,0.18)",
                      transition: "all 0.25s",
                      width: "100%", boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{
                      position: "absolute", right: 14, top: "50%",
                      transform: "translateY(-50%)",
                      color: "rgba(255,255,255,0.55)",
                      background: "none", border: "none", cursor: "pointer",
                    }}
                  >
                    {showPass
                      ? <EyeOff style={{ width: 18, height: 18 }} />
                      : <Eye    style={{ width: 18, height: 18 }} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.025 }}
                whileTap={{  scale: loading ? 1 : 0.975 }}
                style={{
                  height: 52, borderRadius: 16, border: "none",
                  background: loading
                    ? "rgba(45,90,30,0.45)"
                    : `linear-gradient(135deg, ${GOLD_DIM} 0%, ${GOLD} 55%, ${GOLD_DIM} 100%)`,
                  color: WHITE, fontWeight: 800, fontSize: 16,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading ? "none" : [
                    `0 4px 24px rgba(45,90,30,0.55)`,
                    "0 1px 0 rgba(255,255,255,0.30) inset",
                    "0 -1px 0 rgba(0,0,0,0.15) inset",
                  ].join(", "),
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  letterSpacing: "0.04em", transition: "background 0.2s, box-shadow 0.2s",
                  marginTop: 4,
                }}
              >
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.span key="loading"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />
                      Authenticating…
                    </motion.span>
                  ) : (
                    <motion.span key="idle"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <Zap style={{ width: 18, height: 18 }} fill={WHITE} />
                      Enter the Arena
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </form>

          {/* ── Footer ── */}
          <div style={{
            position: "relative", zIndex: 1,
            borderTop: "1px solid rgba(255,255,255,0.18)",
            padding: "14px 28px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            background: "rgba(255,255,255,0.04)",
          }}>
            <Lock style={{ width: 12, height: 12, color: "rgba(255,255,255,0.45)" }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.50)", fontWeight: 500 }}>
              No account?&nbsp;
            </span>
            <Link href="/signup">
              <span style={{
                fontSize: 11, fontWeight: 800, cursor: "pointer",
                textDecoration: "underline", textUnderlineOffset: 2,
                color: "rgba(255,255,255,0.90)",
              }}>
                Create your character →
              </span>
            </Link>
          </div>
        </div>

        {/* ── Badge below card ── */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <Shield style={{ width: 13, height: 13, color: "rgba(255,255,255,0.40)" }} />
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", fontWeight: 500 }}>
            Protected by Fintrust+ Smart Escrow
          </span>
        </div>
      </motion.div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .glass-input::placeholder {
          color: rgba(255,255,255,0.35) !important;
        }
        .glass-input:focus {
          border-color: rgba(255,255,255,0.65) !important;
          background: rgba(255,255,255,0.22) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.40),
            0 0 0 3px rgba(255,255,255,0.12) !important;
        }
      `}</style>
    </div>
  );
}
