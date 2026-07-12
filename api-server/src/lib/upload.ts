import fs from "fs";
import path from "path";
import crypto from "crypto";

// Allowed mime types & file extension pairings
const ALLOWED_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", 
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt"
]);

// Explicitly blocked dangerous extensions
const DANGEROUS_EXTENSIONS = new Set([
  ".js", ".ts", ".html", ".htm", ".exe", ".sh", ".bat", 
  ".py", ".php", ".jsp", ".cgi", ".pl", ".cmd", ".msi", ".jar"
]);

// Helper for reading 3 bytes
function readUInt24BE(buf: Buffer, offset: number): number {
  return (buf[offset] << 16) | (buf[offset + 1] << 8) | buf[offset + 2];
}

// Magic byte verification maps
const MAGIC_BYTES: Record<string, (buf: Buffer) => boolean> = {
  ".pdf": (buf) => buf.length >= 4 && buf.readUInt32BE(0) === 0x25504446, // %PDF
  ".png": (buf) => buf.length >= 8 && buf.readUInt32BE(0) === 0x89504E47 && buf.readUInt32BE(4) === 0x0D0A1A0A,
  ".jpg": (buf) => buf.length >= 3 && readUInt24BE(buf, 0) === 0xFFD8FF,
  ".jpeg": (buf) => buf.length >= 3 && readUInt24BE(buf, 0) === 0xFFD8FF,
  ".gif": (buf) => buf.length >= 6 && buf.toString("ascii", 0, 4) === "GIF8",
  ".docx": (buf) => buf.length >= 4 && buf.readUInt32BE(0) === 0x504B0304, // PK.. (ZIP container)
  ".xlsx": (buf) => buf.length >= 4 && buf.readUInt32BE(0) === 0x504B0304, // PK..
  ".zip": (buf) => buf.length >= 4 && buf.readUInt32BE(0) === 0x504B0304, // PK..
};

export function saveBase64File(base64Str: string, originalFilename: string): string {
  // 1. Sanitize the filename to strip path traversal sequences
  const cleanBaseName = path.basename(originalFilename);
  const ext = path.extname(cleanBaseName).toLowerCase();

  // 2. Validate Extension Whitelist & Blacklist
  if (!ALLOWED_EXTENSIONS.has(ext) || DANGEROUS_EXTENSIONS.has(ext)) {
    throw new Error(`Forbidden file extension: "${ext}"`);
  }

  // 3. Extract base64 payload
  const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  let data = base64Str;
  if (matches && matches.length === 3) {
    data = matches[2];
  }

  const fileBuffer = Buffer.from(data, "base64");

  // 4. Validate Size (Configurable via env, default 10MB)
  const maxSizeBytes = parseInt(process.env.FILE_UPLOAD_MAX_SIZE_BYTES || "", 10) || 10 * 1024 * 1024;
  if (fileBuffer.length > maxSizeBytes) {
    throw new Error(`File size exceeds the limit of ${maxSizeBytes / (1024 * 1024)}MB`);
  }

  // 5. Verify file signature (magic bytes) if validator is available
  const magicValidator = MAGIC_BYTES[ext];
  if (magicValidator && !magicValidator(fileBuffer)) {
    throw new Error(`File content signature does not match file extension "${ext}"`);
  }

  // 6. Enforce directory isolation and safe randomized filename
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Cryptographically random name
  const safeRandomName = `${crypto.randomBytes(16).toString("hex")}_${Date.now()}${ext}`;
  const filePath = path.join(uploadsDir, safeRandomName);

  // Write file
  fs.writeFileSync(filePath, fileBuffer);
  return `/uploads/${safeRandomName}`;
}
