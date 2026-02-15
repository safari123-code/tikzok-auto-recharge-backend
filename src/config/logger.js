export function buildLogger(env) {
  return {
    level: env.NODE_ENV === "production" ? "info" : "debug",
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.*token*",
        "req.headers.*secret*",
        "req.body.phone",
        "req.body.text",
        "res.headers.set-cookie"
      ],
      remove: true
    }
  };
}
