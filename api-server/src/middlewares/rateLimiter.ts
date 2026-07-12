import type { Request, Response, NextFunction } from "express";

interface LimitStore {
  count: number;
  resetTime: number;
  lastAttempt?: number;
}

// In-memory stores
const ipStore = new Map<string, LimitStore>();
const accountStore = new Map<string, LimitStore>();

// Helper to cleanup expired entries occasionally
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of ipStore.entries()) {
    if (now > val.resetTime) ipStore.delete(key);
  }
  for (const [key, val] of accountStore.entries()) {
    if (now > val.resetTime) accountStore.delete(key);
  }
}, 5 * 60 * 1000);

// Helper to get configuration from env
const getEnvNum = (key: string, defaultValue: number): number => {
  const val = process.env[key];
  if (!val) return defaultValue;
  const num = parseInt(val, 10);
  return isNaN(num) ? defaultValue : num;
};

// 1. General Rate Limiter Factory (IP based)
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message: string;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || "unknown-ip";
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    
    let record = ipStore.get(key);
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + options.windowMs,
      };
      ipStore.set(key, record);
      next();
      return;
    }

    if (record.count >= options.max) {
      res.status(429).json({ error: options.message });
      return;
    }

    record.count++;
    next();
  };
}

// 2. Auth Endpoint Rate Limiter with Exponential Backoff Delays
// (login, signup, forgot password, reset password, OTP verification)
export function authRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || "unknown-ip";
  const email = req.body.email ? String(req.body.email).toLowerCase().trim() : null;
  const now = Date.now();

  const maxAttemptsBeforeDelay = getEnvNum("RATE_LIMIT_AUTH_MAX_ATTEMPTS", 5);
  const windowMs = getEnvNum("RATE_LIMIT_AUTH_WINDOW_MS", 60 * 1000); // 1 minute window

  // Track IP attempts
  const ipKey = `auth:${ip}`;
  let ipRecord = ipStore.get(ipKey);
  if (!ipRecord || now > ipRecord.resetTime) {
    ipRecord = { count: 1, resetTime: now + windowMs };
    ipStore.set(ipKey, ipRecord);
  } else {
    ipRecord.count++;
  }

  // Track email attempts if provided
  let emailRecord: LimitStore | undefined;
  if (email) {
    const emailKey = `auth:${email}`;
    emailRecord = accountStore.get(emailKey);
    if (!emailRecord || now > emailRecord.resetTime) {
      emailRecord = { count: 1, resetTime: now + windowMs };
      accountStore.set(emailKey, emailRecord);
    } else {
      emailRecord.count++;
    }
  }

  const maxAttempts = Math.max(ipRecord.count, emailRecord?.count || 0);

  // If attempts exceed the threshold, apply exponential delay
  if (maxAttempts > maxAttemptsBeforeDelay) {
    const exponent = maxAttempts - maxAttemptsBeforeDelay;
    // Calculate delay: 500ms, 1000ms, 2000ms, 4000ms, up to max 15 seconds
    const delayMs = Math.min(15000, 500 * Math.pow(2, exponent));
    
    console.log(`[Rate Limit Backoff] Auth attempts (${maxAttempts}) exceeded for IP: ${ip} / Email: ${email || "N/A"}. Delaying request by ${delayMs}ms.`);
    
    // Check if total threshold is crossed for absolute blocking (e.g. 20 attempts)
    if (maxAttempts > getEnvNum("RATE_LIMIT_AUTH_HARD_MAX", 20)) {
      res.status(429).json({ error: "Too many login attempts. Please try again later." });
      return;
    }

    setTimeout(() => {
      next();
    }, delayMs);
  } else {
    next();
  }
}

// Configurable Limit Instances
export const publicLimiter = createRateLimiter({
  windowMs: getEnvNum("RATE_LIMIT_PUBLIC_WINDOW_MS", 15 * 60 * 1000), // 15 mins
  max: getEnvNum("RATE_LIMIT_PUBLIC_MAX", 100),
  message: "Too many requests from this IP, please try again after 15 minutes",
});

export const authenticatedLimiter = createRateLimiter({
  windowMs: getEnvNum("RATE_LIMIT_USER_WINDOW_MS", 15 * 60 * 1000), // 15 mins
  max: getEnvNum("RATE_LIMIT_USER_MAX", 1000),
  message: "API rate limit exceeded for authenticated session",
});

export const adminLimiter = createRateLimiter({
  windowMs: getEnvNum("RATE_LIMIT_ADMIN_WINDOW_MS", 60 * 1000), // 1 minute
  max: getEnvNum("RATE_LIMIT_ADMIN_MAX", 30),
  message: "Admin API limit exceeded",
});
