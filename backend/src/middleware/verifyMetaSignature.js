import crypto from "node:crypto";

// Meta signature header: X-Hub-Signature-256: sha256=...
export function verifyMetaSignature(env) {
  return async function (req, reply) {
    // Dev: allow local simulation without signature
    if (env.NODE_ENV !== "production") return;

    const sig = req.headers["x-hub-signature-256"];
    if (!sig) return reply.code(401).send("Missing signature");

    const raw = req.rawBody;
    if (!raw) return reply.code(400).send("Missing rawBody");

    const expected = "sha256=" + crypto
      .createHmac("sha256", env.META_APP_SECRET)
      .update(raw)
      .digest("hex");

    if (!timingSafeEqual(String(sig), expected)) {
      return reply.code(401).send("Invalid signature");
    }
  };
}

function timingSafeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
