// src/services/recharge/reloadly/reloadly.auth.service.js
import { request } from "undici";

export function buildReloadlyAuth({ env, log }) {
  let cachedToken = null;
  let expiresAt = 0;

  function assertEnv() {
    if (!env.RELOADLY_CLIENT_ID || !env.RELOADLY_CLIENT_SECRET || !env.RELOADLY_BASE_URL) {
      throw new Error("RELOADLY_ENV_MISSING");
    }
  }

  async function getAccessToken() {
    assertEnv();

    const now = Date.now();
    if (cachedToken && now < expiresAt) {
      return cachedToken;
    }

    const res = await request("https://auth.reloadly.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: env.RELOADLY_CLIENT_ID,
        client_secret: env.RELOADLY_CLIENT_SECRET,
        grant_type: "client_credentials",
        audience: env.RELOADLY_BASE_URL
      }),
      bodyTimeout: 5000
    });

    if (res.statusCode >= 400) {
      const text = await res.body.text();
      log.error({ text }, "Reloadly auth error");
      throw new Error("RELOADLY_AUTH_FAILED");
    }

    const data = await res.body.json();

    cachedToken = data.access_token;
    // refresh 60s avant expiration
    expiresAt = Date.now() + (Number(data.expires_in) - 60) * 1000;

    return cachedToken;
  }

  return { getAccessToken };
}
