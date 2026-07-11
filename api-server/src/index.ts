import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

// Task 1 & 13: Verify environment variables and configuration on startup
const REQUIRED_ENV_VARS = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "EMAIL_FROM",
  "FRONTEND_URL",
  "BACKEND_URL",
  "DATABASE_URL",
  "JWT_SECRET",
];

console.log("\n==================================================");
console.log("[ENV AUDIT] Verifying environment variables on startup...");
for (const envVar of REQUIRED_ENV_VARS) {
  const val = process.env[envVar];
  if (val === undefined || val === "") {
    console.log(`[ENV AUDIT] ❌ MISSING: ${envVar} is undefined or empty!`);
  } else {
    if (envVar.includes("PASS") || envVar.includes("SECRET") || envVar.includes("DATABASE_URL")) {
      console.log(`[ENV AUDIT] ✅ EXISTS: ${envVar} (Length: ${val.length})`);
    } else {
      console.log(`[ENV AUDIT] ✅ EXISTS: ${envVar} = "${val}"`);
    }
  }
}
console.log(`[ENV AUDIT] Current Environment (NODE_ENV): "${process.env.NODE_ENV}"`);
console.log(`[ENV AUDIT] Current Backend Base URL (BACKEND_URL): "${process.env.BACKEND_URL}"`);
console.log(`[ENV AUDIT] Current Frontend URL (FRONTEND_URL): "${process.env.FRONTEND_URL}"`);
console.log("==================================================\n");

import app from "./app";
import { logger } from "./lib/logger";
import { initRealtime } from "./lib/realtime";

const rawPort = process.env["PORT"] || "5000";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

initRealtime(server);
