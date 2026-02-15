// src/services/recharge/reloadly/reloadly.catalog.service.js
import { request } from "undici";

export function buildReloadlyCatalog({ env, log, getAccessToken }) {
  const baseUrl = env.RELOADLY_BASE_URL;

  /* =======================
     🔧 Helper GET Reloadly
     ======================= */
  async function get(path) {
    const token = await getAccessToken();

    const res = await request(`${baseUrl}${path}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    });

    if (res.statusCode >= 400) {
      const text = await res.body.text();
      log.error({ path, text }, "Reloadly API error");
      throw new Error(`Reloadly error ${res.statusCode}`);
    }

    return res.body.json();
  }

  /* =======================
     🌍 PAYS
     ======================= */
  async function getCountriesCached() {
    return await get("/countries");
  }

  function topCountriesForUx(list) {
    return list.slice(0, 8).map((c) => ({
      isoName: c.isoName,
      name: c.name
    }));
  }

  async function findCountryByNameOrCode(input) {
    const t = String(input ?? "").trim().toLowerCase();
    if (!t) return null;

    const countries = await getCountriesCached();
    return (
      countries.find(
        (c) =>
          c.isoName.toLowerCase() === t ||
          c.name.toLowerCase() === t
      ) ?? null
    );
  }

  /* =======================
     📡 AUTO-DETECT OPÉRATEUR
     ======================= */
  async function autoDetectOperator(phone) {
    const data = await get(
      `/operators/auto-detect/phone/${encodeURIComponent(phone)}`
    );

    return {
      id: data.id,
      name: data.name,
      countryCode: data.country?.isoName,
      supportsAirtime: Boolean(data.supportsAirtime),
      supportsData: Boolean(data.supportsData),
      supportsVoice: Boolean(data.supportsVoice)
    };
  }

  /* =======================
     📡 OPÉRATEURS PAR PAYS
     ======================= */
  async function getOperatorsByCountry(countryCode) {
    const data = await get(`/operators/countries/${countryCode}`);

    return (data ?? []).map((op) => ({
      id: op.id,
      name: op.name,
      supportsAirtime: Boolean(op.supportsAirtime),
      supportsData: Boolean(op.supportsData),
      supportsVoice: Boolean(op.supportsVoice)
    }));
  }

  /* =======================
     💰 AIRTIME (CRÉDIT)
     ======================= */
  async function getAirtimeProductsByOperator(operatorId) {
    const data = await get(`/operators/${operatorId}/amounts`);

    return (data.amounts ?? []).map((amount) => ({
      productId: null,
      name: `${amount} ${data.currencyCode}`,
      amount: Number(amount),                 // prix EUR
      currency: data.currencyCode,
      localAmount: Number(amount),
      localCurrency: data.currencyCode
    }));
  }

  /* =======================
     📶 FORFAITS INTERNET (DATA)
     ======================= */
  async function getDataBundlesByOperator(operatorId) {
    const data = await get(`/operators/${operatorId}/data/bundles`);

    return (data.content ?? []).map((bundle) => ({
      productId: bundle.id,
      name: bundle.name,                       // ex: "700 MB – 7 jours"
      amount: Number(bundle.price.amount),     // prix EUR
      currency: bundle.price.currencyCode,
      localAmount: bundle.localAmount ?? null, // ex: 700
      localCurrency: bundle.localCurrency ?? null
    }));
  }

  /* =======================
     📞 FORFAITS VOICE (MINUTES)
     ======================= */
  async function getVoiceBundlesByOperator(operatorId) {
    const data = await get(`/operators/${operatorId}/voice/bundles`);

    return (data.content ?? []).map((bundle) => ({
      productId: bundle.id,
      name: bundle.name,
      amount: Number(bundle.price.amount),
      currency: bundle.price.currencyCode,
      localAmount: bundle.localAmount ?? null,
      localCurrency: bundle.localCurrency ?? null
    }));
  }

  return {
    // Pays
    getCountriesCached,
    topCountriesForUx,
    findCountryByNameOrCode,

    // Opérateurs
    autoDetectOperator,
    getOperatorsByCountry,

    // Produits
    getAirtimeProductsByOperator,
    getDataBundlesByOperator,
    getVoiceBundlesByOperator
  };
}
