import crypto from "node:crypto";

export function sha256Hex(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}

export function randomPublicId(prefix = "TX-") {
  const id = crypto.randomBytes(8).toString("hex");
  return `${prefix}${id}`;
}
