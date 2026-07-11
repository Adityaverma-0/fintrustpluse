import { Router } from "express";
import nodemailer from "nodemailer";

const router = Router();

router.post("/debug/test-email", async (req, res) => {
  const { to } = req.body;
  if (!to || typeof to !== "string") {
    res.status(400).json({ error: "recipient email 'to' is required in request body" });
    return;
  }

  const logs: string[] = [];
  const log = (msg: string, data?: any) => {
    const formatted = data ? `${msg} ${JSON.stringify(data)}` : msg;
    logs.push(formatted);
    console.log(`[SMTP DEBUG] ${formatted}`);
  };

  log("Checking environment variables...");
  log(`SMTP_HOST: ${process.env.SMTP_HOST}`);
  log(`SMTP_PORT: ${process.env.SMTP_PORT}`);
  log(`SMTP_USER: ${process.env.SMTP_USER}`);
  log(`SMTP_PASS Exists: ${process.env.SMTP_PASS ? "TRUE" : "FALSE"}`);
  log(`SMTP_PASS Length: ${process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0}`);

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    res.status(400).json({ 
      error: "SMTP environment variables are not fully configured",
      logs
    });
    return;
  }

  try {
    const rawPass = process.env.SMTP_PASS || "";
    const cleanPass = rawPass.trim().replace(/\s+/g, "");

    log("Creating transporter...");
    const testTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: cleanPass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    log("Verifying connection to SMTP server...");
    await testTransporter.verify();
    log("Verification successful!");

    log(`Sending test email to ${to}...`);
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

    log("Test email sent successfully!", { messageId: info.messageId, response: info.response });
    res.json({
      success: true,
      message: "Test email sent successfully",
      messageId: info.messageId,
      response: info.response,
      logs
    });
  } catch (error: any) {
    log("Error sending email", { message: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      logs
    });
  }
});

router.post("/debug/email", async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "recipient 'email' is required in request body" });
    return;
  }

  const logs: string[] = [];
  const log = (msg: string, data?: any) => {
    const formatted = data ? `${msg} ${JSON.stringify(data)}` : msg;
    logs.push(formatted);
    console.log(`[SMTP DEBUG EMAIL] ${formatted}`);
  };

  try {
    const rawPass = process.env.SMTP_PASS || "";
    const cleanPass = rawPass.trim().replace(/\s+/g, "");

    log("Creating transporter...");
    const testTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: cleanPass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    log("Verifying connection to SMTP server...");
    await testTransporter.verify();
    log("Verification successful!");

    log(`Sending test email to ${email}...`);
    const info = await testTransporter.sendMail({
      from: `"FinTrust+ SMTP Test" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "FinTrust+ SMTP Debug Test",
      html: `<p>SMTP test successful at ${new Date().toISOString()}</p>`,
    });

    log("Email sent successfully!", { messageId: info.messageId, response: info.response });
    res.json({
      success: true,
      message: "Email sent successfully",
      messageId: info.messageId,
      response: info.response,
      logs
    });
  } catch (error: any) {
    log("Error sending email", { message: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      logs
    });
  }
});

export default router;
