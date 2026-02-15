import crypto from "node:crypto";
import { buildIdempotency } from "./idempotency.js";

export function buildSecurity({ env, log }) {
  const idempotency = buildIdempotency();

  const keyRaw = String(env.DATA_ENCRYPTION_KEY ?? "");
  const key = keyRaw ? Buffer.from(keyRaw.padEnd(32, "0").slice(0, 32), "utf8") : null;

  function encrypt(plain) {
    if (!key) return "";
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString("base64");
  }

  function decrypt(b64) {
    if (!key) return "";
    const buf = Buffer.from(String(b64 || ""), "base64");
    if (buf.length < 29) return "";
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(enc), decipher.final()]);
    return plain.toString("utf8");
  }

  return { idempotency, encrypt, decrypt };
}
