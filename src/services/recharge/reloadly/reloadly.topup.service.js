// src/services/recharge/reloadly/reloadly.topup.service.js
import { request } from "undici";

export function buildReloadlyTopup({ env, log, getAccessToken }) {
  const baseUrl = env.RELOADLY_BASE_URL;

  async function post(path, body, { idempotencyKey } = {}) {
    const token = await getAccessToken();

    const res = await request(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(idempotencyKey && { "Idempotency-Key": idempotencyKey })
      },
      body: JSON.stringify(body),
      bodyTimeout: 5000
    });

    if (res.statusCode >= 400) {
      const text = await res.body.text();
      log.error({ path, body, text }, "Reloadly API error");
      throw new Error(`RELOADLY_ERROR_${res.statusCode}`);
    }

    return res.body.json();
  }

  /**
   * 🔹 Estimation officielle Reloadly (montant local)
   * Utilisée AVANT paiement (UX)
   */
  async function estimateLocalAmount({ operatorId, amount, currency }) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("INVALID_ESTIMATE_AMOUNT");
    }

    const data = await post("/topups/estimate", {
      operatorId,
      amount,
      currency
    });

    return {
      localAmount: data.localAmount,
      localCurrency: data.localCurrency
    };
  }

  /**
   * 🔹 Recharge réelle (APRES paiement SumUp)
   * Idempotente via customIdentifier (= orderPublicId)
   */
  async function topup({
    operatorId,
    amount,
    phone,
    countryCode,
    customIdentifier
  }) {
    if (!operatorId || !phone || !countryCode || !customIdentifier) {
      throw new Error("TOPUP_MISSING_REQUIRED_FIELDS");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("INVALID_TOPUP_AMOUNT");
    }

    const data = await post(
      "/topups",
      {
        operatorId,
        amount,
        useLocalAmount: false,
        recipientPhone: {
          number: phone,
          countryCode
        },
        customIdentifier
      },
      {
        idempotencyKey: customIdentifier
      }
    );

    return data;
  }

  return {
    estimateLocalAmount,
    topup
  };
}
