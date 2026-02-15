import { request } from "undici";

export function buildSumUpCheckoutService({ env, getAccessToken, log }) {

  async function createCheckout({
    conversationId,      // 🔑 référence métier
    amount,
    currency = "EUR",
    description
  }) {
    if (!Number.isFinite(amount)) {
      throw new Error("INVALID_AMOUNT");
    }

    const token = await getAccessToken();

    const res = await request(`${env.SUMUP_BASE_URL}/v0.1/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount,                            // ✅ TOTAL À PAYER
        currency,
        merchant_code: env.SUMUP_MERCHANT_CODE,
        description,
        reference: conversationId          // ✅ lien paiement ↔ conversation
      }),
      bodyTimeout: 5000
    });

    if (res.statusCode !== 200 && res.statusCode !== 201) {
      const text = await res.body.text();
      log.error({ text }, "SumUp checkout error");
      throw new Error("SUMUP_CHECKOUT_FAILED");
    }

    const checkout = await res.body.json();

    return {
      checkoutId: checkout.id,
      checkoutUrl: checkout.checkout_url
    };
  }

  return { createCheckout };
}
