// src/services/pricing/pricing.service.js
import { FEES_RULES } from "./fees.rules.js";

export function buildPricingService() {

  function computeFees({ amount }) {
    const base = Number(amount);

    if (!Number.isFinite(base) || base <= 0) {
      throw new Error("INVALID_AMOUNT");
    }

    const fee = FEES_RULES.BY_AMOUNT[String(base)];

    if (fee == null) {
      throw new Error(`UNSUPPORTED_AMOUNT_${base}`);
    }

    const total = Number((base + fee).toFixed(2));

    return {
      price: base,   // montant Reloadly
      fee,           // frais Tikzok
      total          // TOTAL à payer via SumUp Checkout
    };
  }

  return { computeFees };
}
