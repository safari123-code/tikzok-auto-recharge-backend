import crypto from "node:crypto";

export function verifySumupSignature(env) {
  return async function (req, reply) {
    // 🔧 Dev / local : on skip
    if (env.NODE_ENV !== "production") return;

    const header = req.headers["x-sumup-signature"];
    if (!header) {
      return reply.code(401).send("Missing SumUp signature");
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      return reply.code(400).send("Missing raw body");
    }

    // Support formats:
    // - hex simple
    // - t=...,v1=...
    let receivedSignature = header;

    if (header.includes("v1=")) {
      const parts = Object.fromEntries(
        header.split(",").map(p => p.split("="))
      );
      receivedSignature = parts.v1;
    }

    const expectedSignature = crypto
      .createHmac("sha256", env.SUMUP_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (!timingSafeEqual(receivedSignature, expectedSignature)) {
      return reply.code(401).send("Invalid SumUp signature");
    }
  };
}

function timingSafeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
