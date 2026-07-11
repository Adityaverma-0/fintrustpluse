import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT;
const smtpUser = process.env.SMTP_USER;
const rawSmtpPass = process.env.SMTP_PASS;

// Clean password: trim outer spaces, and strip inner spaces for Google App Password compatibility
const smtpPass = rawSmtpPass ? rawSmtpPass.trim().replace(/\s+/g, "") : "";

console.log("[SMTP INIT] SMTP Host:", smtpHost);
console.log("[SMTP INIT] SMTP Port:", smtpPort);
console.log("[SMTP INIT] SMTP User:", smtpUser);
console.log("[SMTP INIT] SMTP Password Length (Raw):", rawSmtpPass ? rawSmtpPass.length : 0);
console.log("[SMTP INIT] SMTP Password Length (Cleaned):", smtpPass.length);
console.log("[SMTP INIT] SMTP Password Contains Spaces:", rawSmtpPass ? /\s/.test(rawSmtpPass) : false);

const isSmtpConfigured = !!(smtpHost && smtpUser && smtpPass);

let transporter: nodemailer.Transporter | null = null;

if (isSmtpConfigured) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(smtpPort || 587),
    secure: smtpPort === "465",
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

// Local simulation inbox log path
const inboxPath = path.resolve(process.cwd(), "email-inbox.json");

interface LocalMailLog {
  to: string;
  subject: string;
  otp?: string;
  body: string;
  timestamp: string;
}

// Log email locally helper
function logEmailLocally(to: string, subject: string, body: string, otp?: string) {
  const mailObj: LocalMailLog = {
    to,
    subject,
    otp,
    body,
    timestamp: new Date().toISOString(),
  };

  console.log(`\n==================================================`);
  console.log(`[EMAIL DISPATCH] To: ${to}`);
  console.log(`[EMAIL DISPATCH] Subject: ${subject}`);
  if (otp) {
    console.log(`[EMAIL DISPATCH] OTP CODE: ${otp} (EXPIRES IN 10 MINUTES)`);
  }
  console.log(`==================================================\n`);

  try {
    let list: LocalMailLog[] = [];
    if (fs.existsSync(inboxPath)) {
      const content = fs.readFileSync(inboxPath, "utf-8");
      list = JSON.parse(content || "[]") as LocalMailLog[];
    }
    list.unshift(mailObj);
    fs.writeFileSync(inboxPath, JSON.stringify(list, null, 2));
  } catch (err) {
    console.error("Failed to write email-inbox.json:", err);
  }
}

export async function sendEmail({
  to,
  subject,
  html,
  otp,
}: {
  to: string;
  subject: string;
  html: string;
  otp?: string;
}) {
  if (isSmtpConfigured && transporter) {
    try {
      await transporter.sendMail({
        from: `"FinTrust+" <${smtpUser}>`,
        to,
        subject,
        html,
      });
      // also log locally for verification
      logEmailLocally(to, subject, html, otp);
    } catch (err) {
      console.error(`[Email Error] Failed to send email via SMTP to ${to}:`, err);
      logEmailLocally(to, `${subject} (SMTP FAILED - FALLBACK LOG)`, html, otp);
    }
  } else {
    logEmailLocally(to, subject, html, otp);
  }
}

export function getVerificationEmailTemplate(name: string, otp: string): string {
  return `
    <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #059669; font-weight: bold; border-bottom: 2px solid #ecfdf5; padding-bottom: 10px;">Verify Your FinTrust+ Email</h2>
      <p style="color: #475569; font-size: 14px;">Hi ${name},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">Thank you for registering on FinTrust+. Please use the following 6-digit verification code to complete your registration:</p>
      <div style="background-color: #f0fdf4; border: 1px solid #d1fae5; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px; padding: 15px; text-align: center; color: #065f46; margin: 20px 0;">
        ${otp}
      </div>
      <p style="color: #64748b; font-size: 12px; margin-top: 10px;">This code is valid for 10 minutes. If you did not request this, you can ignore this email.</p>
    </div>
  `;
}

export function getResetPasswordEmailTemplate(name: string, otp: string): string {
  return `
    <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #2563eb; font-weight: bold; border-bottom: 2px solid #eff6ff; padding-bottom: 10px;">Reset Your Password</h2>
      <p style="color: #475569; font-size: 14px;">Hi ${name},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">We received a request to reset your password. Use the following 6-digit OTP code to authorize your password update:</p>
      <div style="background-color: #f0f9ff; border: 1px solid #e0f2fe; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px; padding: 15px; text-align: center; color: #0369a1; margin: 20px 0;">
        ${otp}
      </div>
      <p style="color: #64748b; font-size: 12px; margin-top: 10px;">This OTP is valid for 10 minutes. If you did not request this password reset, please change your password or contact support immediately.</p>
    </div>
  `;
}

export function getWelcomeEmailTemplate(name: string): string {
  return `
    <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #059669; font-weight: bold; border-bottom: 2px solid #ecfdf5; padding-bottom: 10px;">Welcome to FinTrust+</h2>
      <p style="color: #475569; font-size: 14px;">Hi ${name},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">Welcome to the next generation of escrow-backed freelance contracting! Your email address has been successfully verified, and your account is now fully active.</p>
      <p style="color: #475569; font-size: 14px;">Get started today by updating your profile or exploring available milestone agreements!</p>
    </div>
  `;
}

export function getPasswordChangedEmailTemplate(name: string): string {
  return `
    <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #dc2626; font-weight: bold; border-bottom: 2px solid #fef2f2; padding-bottom: 10px;">Password Changed Successfully</h2>
      <p style="color: #475569; font-size: 14px;">Hi ${name},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">This is a security alert to confirm that your FinTrust+ account password was updated successfully.</p>
      <p style="color: #dc2626; font-weight: 500; font-size: 13px;">If you did not perform this change, please contact our support team immediately to lock your account.</p>
    </div>
  `;
}

export function getWithdrawalOtpEmailTemplate(name: string, otp: string, amount: number): string {
  return `
    <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #059669; font-weight: bold; border-bottom: 2px solid #ecfdf5; padding-bottom: 10px;">Verify Your Withdrawal Request</h2>
      <p style="color: #475569; font-size: 14px;">Hi ${name},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">We received a request to withdraw <strong>$${amount.toFixed(2)}</strong> from your TrustFirst+ wallet. Please use the following 6-digit verification code to complete this transaction:</p>
      <div style="background-color: #f0fdf4; border: 1px solid #d1fae5; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px; padding: 15px; text-align: center; color: #065f46; margin: 20px 0;">
        ${otp}
      </div>
      <p style="color: #64748b; font-size: 12px; margin-top: 10px;">This code is valid for 10 minutes. If you did not request this withdrawal, please secure your account immediately.</p>
    </div>
  `;
}

