import { createHmac, timingSafeEqual, randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const SESSION_SECRET = process.env["SESSION_SECRET"] || "development-only-jwt-session-secret-key";

if (!process.env["SESSION_SECRET"]) {
  console.warn("WARNING: SESSION_SECRET is not set. Falling back to a development-only secret key.");
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64url");
}

function base64UrlDecode(str: string): Buffer {
  return Buffer.from(str, "base64url");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${base64UrlEncode(salt)}:${base64UrlEncode(derivedKey)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltB64, hashB64] = stored.split(":");
  if (!saltB64 || !hashB64) return false;
  const salt = base64UrlDecode(saltB64);
  const storedHash = base64UrlDecode(hashB64);
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  if (derivedKey.length !== storedHash.length) return false;
  return timingSafeEqual(derivedKey, storedHash);
}

export function signToken(userId: number): string {
  const payload = JSON.stringify({ userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const payloadEncoded = base64UrlEncode(Buffer.from(payload, "utf8"));
  const signature = createHmac("sha256", SESSION_SECRET as string)
    .update(payloadEncoded)
    .digest("base64url");
  return `${payloadEncoded}.${signature}`;
}

export function verifyToken(token: string): { userId: number } | null {
  const [payloadEncoded, signature] = token.split(".");
  if (!payloadEncoded || !signature) return null;

  const expectedSignature = createHmac("sha256", SESSION_SECRET as string)
    .update(payloadEncoded)
    .digest("base64url");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadEncoded).toString("utf8")) as {
      userId: number;
      exp: number;
    };
    if (typeof payload.userId !== "number" || payload.exp < Date.now()) return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}
