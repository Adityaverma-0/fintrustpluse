import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
app.set("trust proxy", true);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());

// Task 2: Log every incoming API request details
app.use((req, res, next) => {
  const { method, url, body } = req;
  const sanitizedBody = { ...body };
  if (sanitizedBody.password) sanitizedBody.password = "***HIDDEN***";
  if (sanitizedBody.confirmPassword) sanitizedBody.confirmPassword = "***HIDDEN***";
  if (sanitizedBody.pass) sanitizedBody.pass = "***HIDDEN***";
  console.log(`[API REQUEST] ${method} ${url} - Body:`, JSON.stringify(sanitizedBody));
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

import fs from "fs";
import path from "path";
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

import { publicLimiter } from "./middlewares/rateLimiter";
app.use("/api", publicLimiter, router);

// Serve frontend static assets in production
if (process.env.NODE_ENV === "production") {
  let clientDistPath = path.resolve(process.cwd(), "trustfirst/dist/public");
  if (!fs.existsSync(clientDistPath)) {
    clientDistPath = path.resolve(process.cwd(), "../trustfirst/dist/public");
  }
  
  if (fs.existsSync(clientDistPath)) {
    logger.info({ clientDistPath }, "Serving static frontend files from client distribution");
    app.use(express.static(clientDistPath));
    app.get("/*splat", (req, res, next) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  } else {
    logger.warn({ clientDistPath }, "Frontend distribution directory not found. Static serving skipped.");
  }
}

// Global error handler (Hides stack traces and raw error messages in production)
app.use((err: any, _req: any, res: any, _next: any) => {
  logger.error({ err }, "Unhandled application error");
  
  const status = err.status || 500;
  let userMessage = "An unexpected error occurred. Please try again later.";
  
  if (status < 500 || process.env.NODE_ENV !== "production") {
    userMessage = err.message || userMessage;
  }
  
  res.status(status).json({ error: userMessage });
});

export default app;
