// services/payments/sumup/sumup.token.service.js

import { request } from "undici";

export function buildSumUpTokenService({ env, log }) {
  let cachedToken = null;
  let expiresAt = 0;
  let inFlightPromise = null;

  async function fetchToken() {
    const body =
      `grant_type=client_credentials` +
      `&client_id=${env.SUMUP_CLIENT_ID}` +
      `&client_secret=${env.SUMUP_CLIENT_SECRET}`;

    const res = await request(`${env.SUMUP_BASE_URL}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      bodyTimeout: 5000
    });

    if (res.statusCode !== 200) {
      const text = await res.body.text();
      log.error({ text }, "SumUp OAuth failed");
      throw new Error("SUMUP_AUTH_FAILED");
    }

    const json = await res.body.json();

    cachedToken = json.access_token;
    expiresAt = Date.now() + (json.expires_in - 60) * 1000;
    inFlightPromise = null;

    return cachedToken;
  }

  async function getAccessToken() {
    if (cachedToken && Date.now() < expiresAt) {
      return cachedToken;
    }

    if (!inFlightPromise) {
      inFlightPromise = fetchToken();
    }

    return inFlightPromise;
  }

  return { getAccessToken };
}
