import { Router, type IRouter } from "express";
import nodemailer from "nodemailer";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { hashPassword, verifyPassword, signToken } from "../lib/auth";
import { requireAuth } from "../middlewares/requireAuth";
import { validateRequest } from "../middlewares/validate";
import { z } from "zod";
import { 
  sendEmail, 
  getVerificationEmailTemplate, 
  getResetPasswordEmailTemplate, 
  getWelcomeEmailTemplate, 
  getPasswordChangedEmailTemplate,
  getWithdrawalOtpEmailTemplate
} from "../lib/email";

const router: IRouter = Router();

const RegisterBody = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["freelancer", "client"]),
  title: z.string().optional(),
  bio: z.string().optional(),
  skills: z.string().optional(),
  hourlyRate: z.number().optional(),
  category: z.string().optional(),
  country: z.string().optional(),
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const ForgotPasswordBody = z.object({
  email: z.string().email(),
});

const VerifyResetOtpBody = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

const ResetPasswordBody = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  password: z.string().min(8),
});

const VerifyEmailBody = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

const ResendVerificationBody = z.object({
  email: z.string().email(),
});

// Helper for password strength check
function validatePasswordStrength(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}

router.post("/auth/register", validateRequest({ body: RegisterBody }), async (req, res) => {
  const { name, email, password, role, title, bio, skills, hourlyRate, category, country } = req.body;

  const existing = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });
  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  // Password rules validation on registration as well
  if (!validatePasswordStrength(password)) {
    res.status(400).json({ 
      error: "Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, a number, and a special character." 
    });
    return;
  }

  const passwordHash = await hashPassword(password);

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const [user] = await db.insert(usersTable).values({
    name,
    email,
    passwordHash,
    role,
    title: title ?? null,
    bio: bio ?? null,
    skills: skills ?? null,
    hourlyRate: hourlyRate != null ? String(hourlyRate) : null,
    category: category ?? null,
    country: country ?? null,
    emailVerified: false,
    emailVerificationOtp: otp,
    emailVerificationExpiry: expiry,
    otpAttempts: 0,
    lastOtpSent: new Date(),
  }).returning();

  if (!user) {
    res.status(500).json({ error: "Failed to create account" });
    return;
  }

  // Send Verification Email with await and error catching
  console.log(`[SIGNUP] User created successfully: ${email}. Attempting to send verification email...`);
  try {
    await sendEmail({
      to: email,
      subject: "Verify Your FinTrust+ Account",
      html: getVerificationEmailTemplate(name, otp),
      otp,
    });
    console.log(`[SIGNUP] Verification email sent successfully to ${email}.`);
  } catch (emailErr: any) {
    console.error(`[SIGNUP ERROR] Failed to send verification email to ${email}:`, emailErr);
    res.status(500).json({ 
      error: `Failed to send verification email: ${emailErr.message || "Connection timed out"}. Please check your SMTP settings or try again.` 
    });
    return;
  }

  const token = signToken(user.id);
  const { passwordHash: _ph, ...safeUser } = user;
  res.status(201).json({ token, user: safeUser });
});

router.post("/auth/login", validateRequest({ body: LoginBody }), async (req, res) => {
  const { email, password } = req.body;

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  // Verify email verification state
  if (!user.emailVerified && user.role !== "admin") {
    res.status(403).json({ 
      error: "Email not verified", 
      emailVerified: false, 
      email: user.email 
    });
    return;
  }

  const token = signToken(user.id);
  const { passwordHash: _ph, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.userId!) });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const { passwordHash: _ph, ...safeUser } = user;
  res.json(safeUser);
});

router.post("/auth/verify-kyc", requireAuth, async (req, res) => {
  await db.update(usersTable)
    .set({ isVerified: true })
    .where(eq(usersTable.id, req.userId!));
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.userId!) });
  const { passwordHash: _ph, ...safeUser } = user!;
  res.json(safeUser);
});

router.post("/auth/send-withdrawal-otp", requireAuth, async (req, res) => {
  const parsed = z.object({
    amount: z.number().positive(),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid amount" });
    return;
  }

  const { amount } = parsed.data;

  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.userId!) });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.update(usersTable)
      .set({
        withdrawalOtp: otp,
        withdrawalOtpExpiry: expiry,
      })
      .where(eq(usersTable.id, user.id));

    await sendEmail({
      to: user.email,
      subject: "Withdrawal Verification Code",
      html: getWithdrawalOtpEmailTemplate(user.name, otp, amount),
      otp,
    });

    res.json({ success: true, message: "Withdrawal OTP sent successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================================================
// New Authentication Upgrade APIs
// ==================================================

// POST /auth/send-verification
router.post("/auth/send-verification", validateRequest({ body: ResendVerificationBody }), async (req, res) => {
  const { email } = req.body;

  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });
    if (!user) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    if (user.emailVerified) {
      res.status(400).json({ error: "Email is already verified" });
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await db.update(usersTable)
      .set({
        emailVerificationOtp: otp,
        emailVerificationExpiry: expiry,
        otpAttempts: 0,
        lastOtpSent: new Date(),
      })
      .where(eq(usersTable.id, user.id));

    try {
      await sendEmail({
        to: email,
        subject: "Verify Your FinTrust+ Account",
        html: getVerificationEmailTemplate(user.name, otp),
        otp,
      });
      console.log(`[RESEND VERIFICATION] Email sent successfully to ${email}.`);
    } catch (emailErr: any) {
      console.error(`[RESEND VERIFICATION ERROR] Failed to send email to ${email}:`, emailErr);
      res.status(500).json({ 
        error: `Failed to send verification email: ${emailErr.message || "Connection timed out"}. Please check your SMTP settings or try again.` 
      });
      return;
    }

    res.json({ success: true, message: "Verification OTP sent successfully" });
  } catch (error: any) {
    console.error(`[RESEND VERIFICATION SYSTEM ERROR]`, error);
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/verify-email
router.post("/auth/verify-email", validateRequest({ body: VerifyEmailBody }), async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });
    if (!user) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    if (user.emailVerified) {
      res.status(400).json({ error: "Email is already verified" });
      return;
    }

    if (user.otpAttempts >= 5) {
      res.status(400).json({ error: "Maximum OTP attempts exceeded. Please request a new verification code." });
      return;
    }

    if (!user.emailVerificationOtp || !user.emailVerificationExpiry) {
      res.status(400).json({ error: "No verification request found. Please request a new code." });
      return;
    }

    if (new Date() > user.emailVerificationExpiry) {
      res.status(400).json({ error: "Verification code expired. Please request a new code." });
      return;
    }

    if (user.emailVerificationOtp !== otp.trim()) {
      await db.update(usersTable)
        .set({ otpAttempts: user.otpAttempts + 1 })
        .where(eq(usersTable.id, user.id));
      res.status(400).json({ error: "Invalid verification code" });
      return;
    }

    // Success
    await db.update(usersTable)
      .set({
        emailVerified: true,
        emailVerificationOtp: null,
        emailVerificationExpiry: null,
        otpAttempts: 0,
      })
      .where(eq(usersTable.id, user.id));

    // Send Welcome Email
    sendEmail({
      to: email,
      subject: "Welcome to FinTrust+!",
      html: getWelcomeEmailTemplate(user.name),
    }).catch(err => console.error("Welcome email delivery error:", err));

    const token = signToken(user.id);
    const { passwordHash: _ph, ...safeUser } = user;
    res.json({ token, user: { ...safeUser, emailVerified: true } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/resend-verification
router.post("/auth/resend-verification", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });
    if (!user) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    if (user.emailVerified) {
      res.status(400).json({ error: "Email is already verified" });
      return;
    }

    // Resend Cooldown of 60 seconds
    if (user.lastOtpSent) {
      const timeDiffSec = (Date.now() - new Date(user.lastOtpSent).getTime()) / 1000;
      if (timeDiffSec < 60) {
        res.status(429).json({ error: `Please wait ${Math.ceil(60 - timeDiffSec)} seconds before requesting a new code.` });
        return;
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await db.update(usersTable)
      .set({
        emailVerificationOtp: otp,
        emailVerificationExpiry: expiry,
        otpAttempts: 0,
        lastOtpSent: new Date(),
      })
      .where(eq(usersTable.id, user.id));

    await sendEmail({
      to: email,
      subject: "Verify Your FinTrust+ Account",
      html: getVerificationEmailTemplate(user.name, otp),
      otp,
    });

    res.json({ success: true, message: "Verification OTP resent successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/forgot-password
router.post("/auth/forgot-password", validateRequest({ body: ForgotPasswordBody }), async (req, res) => {
  const { email } = req.body;
  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });
    if (!user) {
      res.status(404).json({ error: "Account with this email does not exist" });
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    console.log(`[FORGOT PASSWORD] Storing OTP for user ${email}...`);
    await db.update(usersTable)
      .set({
        resetPasswordOtp: otp,
        resetPasswordExpiry: expiry,
        otpAttempts: 0,
        lastOtpSent: new Date(),
      })
      .where(eq(usersTable.id, user.id));
    console.log(`[FORGOT PASSWORD] OTP stored. Sending email...`);

    try {
      await sendEmail({
        to: email,
        subject: "Reset Your FinTrust+ Password",
        html: getResetPasswordEmailTemplate(user.name, otp),
        otp,
      });
      console.log(`[FORGOT PASSWORD] Reset email sent successfully to ${email}.`);
    } catch (emailErr: any) {
      console.error(`[FORGOT PASSWORD ERROR] Failed to send password reset email to ${email}:`, emailErr);
      res.status(500).json({ 
        error: `Failed to send password reset email: ${emailErr.message || "Connection timed out"}. Please check your SMTP settings or try again.` 
      });
      return;
    }

    res.json({ success: true, email, message: "Password reset OTP sent successfully" });
  } catch (error: any) {
    console.error(`[FORGOT PASSWORD SYSTEM ERROR]`, error);
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/verify-reset-otp
router.post("/auth/verify-reset-otp", validateRequest({ body: VerifyResetOtpBody }), async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });
    if (!user) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    if (user.otpAttempts >= 5) {
      res.status(400).json({ error: "Maximum OTP attempts exceeded. Please request a new code." });
      return;
    }

    if (!user.resetPasswordOtp || !user.resetPasswordExpiry) {
      res.status(400).json({ error: "No password reset request found. Please request a code." });
      return;
    }

    if (new Date() > user.resetPasswordExpiry) {
      res.status(400).json({ error: "Verification code expired. Please request a new code." });
      return;
    }

    if (user.resetPasswordOtp !== otp.trim()) {
      await db.update(usersTable)
        .set({ otpAttempts: user.otpAttempts + 1 })
        .where(eq(usersTable.id, user.id));
      res.status(400).json({ error: "Invalid verification code" });
      return;
    }

    res.json({ success: true, email, otp, message: "OTP verified successfully. You can now reset your password." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/reset-password
router.post("/auth/reset-password", validateRequest({ body: ResetPasswordBody }), async (req, res) => {
  const { email, otp, password } = req.body;
  if (!email || !otp || !password) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });
    if (!user) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp.trim()) {
      res.status(400).json({ error: "Unauthorized password reset attempt. Verify OTP first." });
      return;
    }

    if (new Date() > user.resetPasswordExpiry!) {
      res.status(400).json({ error: "Verification code expired. Please request a new code." });
      return;
    }

    // Validate strength
    if (!validatePasswordStrength(password)) {
      res.status(400).json({ 
        error: "Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, a number, and a special character." 
      });
      return;
    }

    const passwordHash = await hashPassword(password);

    await db.update(usersTable)
      .set({
        passwordHash,
        resetPasswordOtp: null,
        resetPasswordExpiry: null,
        otpAttempts: 0,
      })
      .where(eq(usersTable.id, user.id));

    // Send changed confirmation mail
    sendEmail({
      to: email,
      subject: "Security Notification: Password Changed",
      html: getPasswordChangedEmailTemplate(user.name),
    }).catch(err => console.error("Password notification email delivery error:", err));

    res.json({ success: true, message: "Password Changed Successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /auth/check-email-status
router.get("/auth/check-email-status", async (req, res) => {
  const { email } = req.query;
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email query param is required" });
    return;
  }

  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });
    if (!user) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    res.json({ emailVerified: user.emailVerified });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /auth/dev-otp (Developer testing fallback only)
router.get("/auth/dev-otp", async (req, res) => {
  const { email } = req.query;
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email parameter is required" });
    return;
  }
  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({
      emailVerificationOtp: user.emailVerificationOtp,
      resetPasswordOtp: user.resetPasswordOtp,
      withdrawalOtp: user.withdrawalOtp,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/send-test-email (Temporary route for diagnostics)
router.post("/auth/send-test-email", async (req, res) => {
  const { to } = req.body;
  if (!to || typeof to !== "string") {
    res.status(400).json({ error: "recipient email 'to' is required in request body" });
    return;
  }

  console.log("[SMTP TEST] Checking environment variables...");
  console.log(`SMTP_HOST: ${process.env.SMTP_HOST}`);
  console.log(`SMTP_PORT: ${process.env.SMTP_PORT}`);
  console.log(`SMTP_USER: ${process.env.SMTP_USER}`);
  console.log(`SMTP_PASS: ${process.env.SMTP_PASS ? "***HIDDEN***" : "MISSING"}`);

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    res.status(400).json({ 
      error: "SMTP environment variables are not fully configured",
      details: {
        host: !!process.env.SMTP_HOST,
        user: !!process.env.SMTP_USER,
        pass: !!process.env.SMTP_PASS
      }
    });
    return;
  }

  try {
    const rawPass = process.env.SMTP_PASS || "";
    const cleanPass = rawPass.trim().replace(/\s+/g, "");

    console.log("[SMTP TEST] Creating Nodemailer transporter...");
    console.log("[SMTP TEST] Pass length (Raw):", rawPass.length);
    console.log("[SMTP TEST] Pass length (Clean):", cleanPass.length);
    console.log("[SMTP TEST] Pass contains spaces:", /\s/.test(rawPass));

    const testTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: cleanPass,
      },
    });

    console.log("[SMTP TEST] Verifying connection to SMTP server...");
    await testTransporter.verify();
    console.log("[SMTP TEST] Verification successful!");

    console.log(`[SMTP TEST] Sending test email to ${to}...`);
    const info = await testTransporter.sendMail({
      from: `"FinTrust+ SMTP Test" <${process.env.SMTP_USER}>`,
      to,
      subject: "FinTrust+ SMTP Connection Test",
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2563eb;">Connection Successful!</h2>
          <p>This is a test email from the FinTrust+ platform to verify SMTP configuration and Gmail integration.</p>
          <p style="font-size: 12px; color: #64748b;">Timestamp: ${new Date().toISOString()}</p>
        </div>
      `,
    });

    console.log("[SMTP TEST] Test email sent successfully!", info);
    res.json({ 
      success: true, 
      message: "Test email sent successfully", 
      messageId: info.messageId,
      response: info.response
    });
  } catch (error: any) {
    console.error("[SMTP TEST ERROR] Full Stack Trace:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message, 
      stack: error.stack 
    });
  }
});

export default router;
