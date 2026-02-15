// src/services/recharge/reloadly/reloadly.client.js
import { request } from "undici";

export function buildReloadlyClient({ env, log, getAccessToken }) {
  const baseUrl = env.RELOADLY_BASE_URL;

  async function api(
    path,
    { method = "GET", body, headers = {} } = {}
  ) {
    const token = await getAccessToken();

    const res = await request(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined,
      bodyTimeout: 5000
    });

    let json = null;
    try {
      json = await res.body.json();
    } catch {
      /* ignore */
    }

    if (res.statusCode >= 400) {
      log.error(
        { path, statusCode: res.statusCode, json },
        "Reloadly API error"
      );
      throw new Error(`RELOADLY_API_${res.statusCode}`);
    }

    return json;
  }

  return { api };
}
