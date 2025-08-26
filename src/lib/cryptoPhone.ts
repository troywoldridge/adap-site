// src/lib/cryptoPhone.ts
import crypto from "node:crypto";

// WARNING: rotate/manage keys properly in production.
const KEY = crypto.createHash("sha256").update(String(process.env.PHONE_ENC_KEY || "dev-key")).digest();

export async function encryptPhone(plain: string): Promise<Buffer> {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // pack: [iv|tag|ciphertext]
  return Buffer.concat([iv, tag, enc]);
}
