export async function rawBodyPlugin(app) {
  // Capture raw body as Buffer for signature verification
  app.addContentTypeParser("*", { parseAs: "buffer" }, (req, body, done) => {
    req.rawBody = body;
    done(null, body);
  });

  // If JSON, parse Buffer into object for handlers
  app.addHook("preValidation", async (req) => {
    const ct = String(req.headers["content-type"] ?? "").toLowerCase();
    if (Buffer.isBuffer(req.body) && ct.includes("application/json")) {
      try {
        req.body = JSON.parse(req.body.toString("utf8"));
      } catch {
        // keep as-is; controller will ignore if not parsable
      }
    }
  });
}
