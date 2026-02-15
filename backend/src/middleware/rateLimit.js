export function buildRateLimitOptions(env) {
  const prod = env.NODE_ENV === "production";
  return {
    max: prod ? 120 : 500,
    timeWindow: "1 minute",
    keyGenerator: (req) => req.headers["x-forwarded-for"] || req.ip
  };
}
