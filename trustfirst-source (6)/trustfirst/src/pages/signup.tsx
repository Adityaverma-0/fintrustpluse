import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Briefcase, Code } from "lucide-react";

const WHITE = "#FFFFFF";
const GOLD  = "#2D5A1E";
const GOLD_DIM = "#4A8030";

export default function Signup() {
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
          objectFit: "cover", opacity: 0.70, zIndex: 0,
        }}
      >
        <source src="/signup-bg.mp4" type="video/mp4" />
      </video>
      {/* ── Vignette overlay ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: "radial-gradient(ellipse at center, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.55) 100%)",
      }} />
      {/* ── Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg relative"
        style={{ zIndex: 2 }}
      >
        {/* Liquid Glass shell */}
        <div style={{
          borderRadius: 28,
          overflow: "hidden",
          background: "linear-gradient(160deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 100%)",
          backdropFilter:       "blur(28px) saturate(180%) brightness(1.08)",
          WebkitBackdropFilter: "blur(28px) saturate(180%) brightness(1.08)",
          border: "1px solid rgba(255,255,255,0.35)",
          boxShadow: [
            "0 2px 0 0 rgba(255,255,255,0.55) inset",
            "0 -1px 0 0 rgba(255,255,255,0.12) inset",
            "1px 0 0 0 rgba(255,255,255,0.18) inset",
            "-1px 0 0 0 rgba(255,255,255,0.10) inset",
            "0 32px 80px rgba(0,0,0,0.55)",
            "0 8px 24px rgba(0,0,0,0.35)",
          ].join(", "),
          position: "relative",
        }}>

          {/* Inner refraction shimmer */}
          <div style={{
            pointerEvents: "none",
            position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)",
            width: "80%", height: 120,
            background: "radial-gradient(ellipse, rgba(255,255,255,0.28) 0%, transparent 70%)",
            filter: "blur(18px)", zIndex: 0,
          }} />

          {/* ── Logo section ── */}
          <div className="font-extralight" style={{
            position: "relative", zIndex: 1,
            background: "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 100%)",
            borderBottom: "1px solid rgba(255,255,255,0.20)",
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "28px 28px 20px",
          }}>
            <motion.img
              src="/logo-nobg.png"
              alt="TrustFirst+ Logo"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.18 }}
              style={{
                width: 160, height: 160, objectFit: "contain",
                filter: "brightness(0) invert(1) drop-shadow(0 4px 20px rgba(255,255,255,0.25))",
              }}
            />
            <h2 className="mt-2 text-center font-thin text-[15px] text-[#d1c9c9]"
                style={{ textShadow: "0 1px 12px rgba(0,0,0,0.4)" }}>Thank you for connecting us</h2>
          </div>

          {/* ── Options ── */}
          <div style={{ position: "relative", zIndex: 1, padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              {
                href: "/signup/client",
                Icon: Briefcase,
                title: "I'm a Client",
                subtitle: "Hiring for a project",
                desc: "Post jobs, find top talent, and manage projects with AI-powered matching and smart escrow protection.",
                accent: "rgba(96,165,250,1)",
                accentBg: "rgba(96,165,250,0.32)",
              },
              {
                href: "/signup/freelancer",
                Icon: Code,
                title: "I'm a Freelancer",
                subtitle: "Looking for work",
                desc: "Find great clients, showcase your skills, and get paid securely through our milestone-based escrow system.",
                accent: "rgba(100,200,80,1)",
                accentBg: "rgba(100,200,80,0.28)",
              },
            ].map((opt, i) => (
              <Link key={opt.href} href={opt.href}>
                <motion.div
                  whileHover={{ scale: 1.015, y: -2 }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 16,
                    padding: "18px 20px",
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.10)",
                    backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.22)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 16px rgba(0,0,0,0.20)",
                    cursor: "pointer",
                    transition: "box-shadow 0.2s",
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: opt.accentBg,
                    border: `1.5px solid ${opt.accent}99`,
                    boxShadow: `0 0 24px ${opt.accent}66, 0 0 8px ${opt.accent}44 inset`,
                  }}>
                    <opt.Icon style={{ width: 26, height: 26, color: opt.accent, filter: `drop-shadow(0 0 6px ${opt.accent})` }} />
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: 16, color: WHITE }}>
                        {opt.title}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: "rgba(255,255,255,0.55)",
                        background: "rgba(255,255,255,0.12)",
                        border: "1px solid rgba(255,255,255,0.18)",
                        padding: "2px 8px", borderRadius: 99,
                      }}>
                        {opt.subtitle}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.45, margin: 0 }}>
                      {opt.desc}
                    </p>
                  </div>

                  <ArrowRight style={{ width: 18, height: 18, color: "rgba(255,255,255,0.40)", flexShrink: 0 }} />
                </motion.div>
              </Link>
            ))}
          </div>

          {/* ── Footer ── */}
          <div style={{
            position: "relative", zIndex: 1,
            borderTop: "1px solid rgba(255,255,255,0.18)",
            padding: "14px 28px",
            textAlign: "center",
            background: "rgba(255,255,255,0.04)",
          }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.50)" }}>
              Already have an account?{" "}
            </span>
            <Link href="/login">
              <span style={{
                fontSize: 13, fontWeight: 800,
                color: WHITE, cursor: "pointer",
                textDecoration: "underline", textUnderlineOffset: 2,
              }}>
                Log in
              </span>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
