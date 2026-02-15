// backend/src/services/conversations/conversation.service.js
import { sha256Hex, randomPublicId } from "../../utils/crypto.js";
import { normalizeText } from "../../utils/normalize.js";
import { APP } from "../../config/constants.js";
import { STATES } from "./state.machine.js";
import { INTENTS } from "./intents.js";
import { normalizePhone } from "../security/phone.normalizer.js";
import { maskPhone } from "../security/pii.masking.js";
import { buildPricingService } from "../pricing/pricing.service.js";

function isYes(text) {
  const t = normalizeText(text);
  return ["yes", "y", "ok", "okay", "oui", "o", "evet", "tamam", "نعم", "اي", "أجل", "1"].includes(t);
}

function isNo(text) {
  const t = normalizeText(text);
  return ["no", "n", "non", "hayir", "hayır", "لا", "0", "2"].includes(t);
}

function parseFreeAmountInput(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return null;
  const normalized = raw.replace(",", "."); // FR "9,99" -> "9.99"
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return Number(n.toFixed(2));
}

function clampAmount(amount) {
  const min = Number(APP.MIN_AMOUNT_EUR ?? 1.99);
  const max = Number(APP.MAX_AMOUNT_EUR ?? 50);
  if (!Number.isFinite(amount)) return { ok: false };
  if (amount < min || amount > max) return { ok: false, min, max };
  return { ok: true, min, max };
}

function nowIso() {
  return new Date().toISOString();
}

function safeStateData(convo) {
  return convo?.stateData ?? convo?.state_data ?? {};
}

// serviceType interne (AIRTIME/DATA/VOICE) -> libellé utilisateur
function serviceLabelFromType(serviceType) {
  const t = String(serviceType ?? "").toUpperCase();
  if (t === "AIRTIME") return "Crédit mobile";
  if (t === "DATA") return "Internet";
  if (t === "VOICE") return "Minutes";
  return serviceType ?? "";
}

// Statuts "order" (séparés de la machine WhatsApp)
const ORDER_STATUS = {
  DRAFT: "DRAFT",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  PROCESSING_TOPUP: "PROCESSING_TOPUP",
  DONE: "DONE",
  FAILED: "FAILED"
};

export function buildConversationService({
  repos,
  whatsappSender,
  whatsappParser,
  replyFormatter,
  languageDetector,
  reloadlyCatalog,
  reloadlyTopup,
  sumupCheckout,
  security,
  env,
  log
}) {
  const pricingService = buildPricingService();

  function extractIncoming(reqBody) {
    return whatsappParser.extractIncoming(reqBody);
  }

  async function handleIncoming(incoming) {
    const from = incoming.from;
    const phoneHash = sha256Hex(from);

    // journaliser sans PII en clair (texte redacted)
    await repos.messages.add({
      phoneHash,
      direction: "IN",
      type: incoming.type,
      text: incoming.text ? "[REDACTED]" : null,
      providerMessageId: incoming.messageId
    });

    let convo = await repos.conversations.getByPhoneHash(phoneHash);

    // init conversation
    if (!convo) {
      convo = await repos.conversations.upsert({
        phoneHash,
        language: APP.DEFAULT_LANG ?? "fr",
        state: STATES.WAITING_COUNTRY,
        stateData: {},
        lastUserAt: nowIso()
      });
    }

    // language detect best-effort
    try {
      const detected = await languageDetector.detectLanguage(incoming.text);
      if (detected && detected !== convo.language) {
        convo.language = detected;
        convo.lastUserAt = nowIso();
        await repos.conversations.upsert(convo);
      }
    } catch (e) {
      log?.debug?.({ err: String(e?.message ?? e) }, "language_detect_failed");
    }

    const state = convo.state;
    const data = safeStateData(convo);
    const userText = (incoming.text ?? "").trim();

    // router
    if (state === STATES.WAITING_COUNTRY) return stepCountry({ from, phoneHash, convo, data, userText });
    if (state === STATES.WAITING_PHONE) return stepPhone({ from, phoneHash, convo, data, userText });
    if (state === STATES.WAITING_OPERATOR_CONFIRM) return stepOperatorConfirm({ from, phoneHash, convo, data, userText });
    if (state === STATES.WAITING_SERVICE_TYPE) return stepServiceType({ from, phoneHash, convo, data, userText });
    if (state === STATES.WAITING_AMOUNT) return stepAmount({ from, phoneHash, convo, data, userText });
    if (state === STATES.WAITING_ORDER_CONFIRM) return stepOrderConfirm({ from, phoneHash, convo, data, userText });

    // si paiement en attente : on peut rappeler le lien
    if (state === STATES.WAITING_PAYMENT) {
      const msg = replyFormatter.format({
        language: convo.language,
        intent: INTENTS.PAYMENT_PENDING,
        data: { payUrl: data.payUrl ?? null }
      });
      await whatsappSender.sendText({ to: from, body: msg });
      await repos.messages.add({ phoneHash, direction: "OUT", type: "text", text: msg });
      return;
    }

    // fallback reset
    const msg = replyFormatter.format({
      language: convo.language,
      intent: INTENTS.FALLBACK_RESET,
      data: {}
    });
    await whatsappSender.sendText({ to: from, body: msg });
    await repos.messages.add({ phoneHash, direction: "OUT", type: "text", text: msg });

    convo.state = STATES.WAITING_COUNTRY;
    convo.stateData = {};
    convo.lastUserAt = nowIso();
    await repos.conversations.upsert(convo);
  }

  async function stepCountry({ from, phoneHash, convo, data, userText }) {
    const c = await reloadlyCatalog.findCountryByNameOrCode(userText);

    if (!c) {
      const countries = await reloadlyCatalog.getCountriesCached();
      const top = reloadlyCatalog.topCountriesForUx(countries);

      const msg = replyFormatter.format({
        language: convo.language,
        intent: INTENTS.ASK_COUNTRY,
        data: { topCountries: top }
      });

      await whatsappSender.sendText({ to: from, body: msg });
      await repos.messages.add({ phoneHash, direction: "OUT", type: "text", text: msg });
      return;
    }
    

   // 🔒 Seul Afghanistan est actif pour le moment
   if (c.isoName !== "AF") {
   const msg =
    "🙏 Merci pour votre visite !\n\n" +
    "Les services pour ce pays seront disponibles très prochainement.\n" +
    "Nous vous remercions pour votre confiance.";

   await whatsappSender.sendText({ to: from, body: msg });
   await repos.messages.add({
    phoneHash,
    direction: "OUT",
    type: "text",
    text: msg
  });

  return; // ⛔ stop le flow pour tous les autres pays
 }



    convo.state = STATES.WAITING_PHONE;
    convo.stateData = {
      countryCode: c.isoName,
      countryName: c.name,
      currency: c.currencyCode
    };
    convo.lastUserAt = nowIso();
    await repos.conversations.upsert(convo);

    const msg = replyFormatter.format({
      language: convo.language,
      intent: INTENTS.ASK_PHONE,
      data: {}
    });

    await whatsappSender.sendText({ to: from, body: msg });
    await repos.messages.add({ phoneHash, direction: "OUT", type: "text", text: msg });
  }

  async function stepPhone({ from, phoneHash, convo, data, userText }) {
    let phone;
    try {
      phone = normalizePhone(userText, data.countryCode);
    } catch {
      const msg = replyFormatter.format({
        language: convo.language,
        intent: INTENTS.INVALID_PHONE,
        data: {}
      });
      await whatsappSender.sendText({ to: from, body: msg });
      await repos.messages.add({ phoneHash, direction: "OUT", type: "text", text: msg });
      return;
    }

    // auto detect opérateur
    const op = await reloadlyCatalog.autoDetectOperator(phone);

    const nextData = {
      ...data,
      phone,
      phoneMasked: maskPhone(phone),
      operatorId: op?.id ?? null,
      operatorName: op?.name ?? "Unknown"
    };

    convo.state = STATES.WAITING_OPERATOR_CONFIRM;
    convo.stateData = nextData;
    convo.lastUserAt = nowIso();
    await repos.conversations.upsert(convo);

    const msg = replyFormatter.format({
      language: convo.language,
      intent: INTENTS.CONFIRM_OPERATOR,
      data: { operatorName: nextData.operatorName, phoneMasked: nextData.phoneMasked }
    });

    await whatsappSender.sendText({ to: from, body: msg });
    await repos.messages.add({ phoneHash, direction: "OUT", type: "text", text: msg });
  }

  async function stepOperatorConfirm({ from, phoneHash, convo, data, userText }) {
    if (!isYes(userText)) {
      // retour saisie téléphone
      convo.state = STATES.WAITING_PHONE;
      convo.lastUserAt = nowIso();
      await repos.conversations.upsert(convo);

      const msg = replyFormatter.format({
        language: convo.language,
        intent: INTENTS.ASK_PHONE,
        data: {}
      });

      await whatsappSender.sendText({ to: from, body: msg });
      await repos.messages.add({ phoneHash, direction: "OUT", type: "text", text: msg });
      return;
    }

    // si pas d'opérateur détecté : reset
    if (!data.operatorId) {
      const msg = replyFormatter.format({
        language: convo.language,
        intent: INTENTS.FALLBACK_RESET,
        data: {}
      });

      await whatsappSender.sendText({ to: from, body: msg });
      await repos.messages.add({ phoneHash, direction: "OUT", type: "text", text: msg });

      convo.state = STATES.WAITING_COUNTRY;
      convo.stateData = {};
      convo.lastUserAt = nowIso();
      await repos.conversations.upsert(convo);
      return;
    }

    convo.state = STATES.WAITING_SERVICE_TYPE;
    convo.lastUserAt = nowIso();
    await repos.conversations.upsert(convo);

    const msg = replyFormatter.format({
      language: convo.language,
      intent: INTENTS.ASK_SERVICE_TYPE,
      data: {}
    });

    await whatsappSender.sendText({ to: from, body: msg });
    await repos.messages.add({ phoneHash, direction: "OUT", type: "text", text: msg });
  }

  async function stepServiceType({ from, phoneHash, convo, data, userText }) {
    const t = normalizeText(userText);

    let serviceType = null;
    if (t === "1" || t.includes("credit") || t.includes("airtime") || t.includes("crédit")) serviceType = "AIRTIME";
    else if (t === "2" || t.includes("internet") || t.includes("data")) serviceType = "DATA";
    else if (t === "3" || t.includes("minute") || t.includes("voice") || t.includes("appel")) serviceType = "VOICE";

    if (!serviceType) {
      const msg = replyFormatter.format({
        language: convo.language,
        intent: INTENTS.FALLBACK_RESET,
        data: {}
      });

      await whatsappSender.sendText({ to: from, body: msg });
      await repos.messages.add({ phoneHash, direction: "OUT", type: "text", text: msg });

      convo.state = STATES.WAITING_COUNTRY;
      convo.stateData = {};
      convo.lastUserAt = nowIso();
      await repos.conversations.upsert(convo);
      return;
    }

    // charge produits selon type
    const products =
      serviceType === "AIRTIME"
        ? await reloadlyCatalog.getAirtimeProductsByOperator(data.operatorId)
        : serviceType === "DATA"
          ? await reloadlyCatalog.getDataBundlesByOperator(data.operatorId)
          : await reloadlyCatalog.getVoiceBundlesByOperator(data.operatorId);

    convo.state = STATES.WAITING_AMOUNT;
    convo.stateData = { ...data, serviceType, products };
    convo.lastUserAt = nowIso();
    await repos.conversations.upsert(convo);

    const msg = replyFormatter.format({
      language: convo.language,
      intent: INTENTS.ASK_PRODUCT,
      data: { products }
    });

    await whatsappSender.sendText({ to: from, body: msg });
    await repos.messages.add({ phoneHash, direction: "OUT", type: "text", text: msg });
  }

  // ✅ Etape montant / produit : support choix index + montant libre
  async function stepAmount({ from, phoneHash, convo, data, userText }) {
    const products = data.products ?? [];

    // 1) Montant libre (ex: "9.99" ou "9,99")
    const freeAmount = parseFreeAmountInput(userText);
    if (freeAmount !== null) {
      const check = clampAmount(freeAmount);
      if (!check.ok) {
        const msg = replyFormatter.format({
          language: convo.language,
          intent: INTENTS.FALLBACK_RESET,
          data: {}
        });
        await whatsappSender.sendText({ to: from, body: msg });
        await repos.messages.add({ phoneHash, direction: "OUT", type: "text", text: msg });

        convo.state = STATES.WAITING_COUNTRY;
        convo.stateData = {};
        convo.lastUserAt = nowIso();
        await repos.conversations.upsert(convo);
        return;
      }

      // estimation Reloadly (si dispo)
      const estimate = await reloadlyTopup.estimateLocalAmount({
        operatorId: data.operatorId,
        amount: freeAmount,
        currency: "EUR"
      });

      // ✅ pricing final : uniquement chiffres
      const pricing = pricingService.computePricing({
        rechargeAmount: freeAmount
      });

      const orderPublicId = randomPublicId("TX-");

      await repos.orders.createDraft({ publicId: orderPublicId, phoneHash, status: ORDER_STATUS.DRAFT });

      await repos.orders.update(orderPublicId, {
        status: ORDER_STATUS.DRAFT,
        operator_id: data.operatorId,
        operator_name: data.operatorName,
        country_code: data.countryCode,

        amount: freeAmount,
        currency: "EUR",
        local_amount: Number(estimate?.localAmount ?? 0),
        local_currency: estimate?.localCurrency ?? null,

        fee: pricing.fee,
        total: pricing.total,

        phone_masked: data.phoneMasked,
        phone_enc: security.encrypt(data.phone),
        wa_to_enc: security.encrypt(from)
      });

      convo.state = STATES.WAITING_ORDER_CONFIRM;
      convo.stateData = {
        ...data,
        product: null,
        productLabel: "Montant libre",
        price: freeAmount,
        currency: "EUR",
        localAmount: Number(estimate?.localAmount ?? 0),
        localCurrency: estimate?.localCurrency ?? null,
        fee: pricing.fee,
        total: pricing.total,
        reference: orderPublicId,
        orderPublicId
      };
      convo.lastUserAt = nowIso();
      await repos.conversations.upsert(convo);

      const msg = replyFormatter.format({
        language: convo.language,
        intent: INTENTS.ORDER_SUMMARY,
        data: {
          countryLabel: `${data.countryName} (${data.countryCode})`,
          phoneMasked: data.phoneMasked,
          operatorName: data.operatorName,
          serviceLabel: serviceLabelFromType(data.serviceType),
          productLabel: "Montant libre",
          price: freeAmount,
          currency: "EUR",
          localAmount: Number(estimate?.localAmount ?? 0),
          localCurrency: estimate?.localCurrency ?? null,
          fee: pricing.fee,
          total: pricing.total,
          reference: orderPublicId
        }
      });

      await whatsappSender.sendText({ to: from, body: msg });
      await repos.messages.add({ phoneHash, direction: "OUT", type: "text", text: msg });
      return;
    }

    // 2) Choix par index
    const idx = Number(userText.trim());
    if (!Number.isFinite(idx) || idx < 1 || idx > products.length) {
      const msg = replyFormatter.format({
        language: convo.language,
        intent: INTENTS.FALLBACK_RESET,
        data: {}
      });

      await whatsappSender.sendText({ to: from, body: msg });
      await repos.messages.add({ phoneHash, direction: "OUT", type: "text", text: msg });

      convo.state = STATES.WAITING_COUNTRY;
      convo.stateData = {};
      convo.lastUserAt = nowIso();
      await repos.conversations.upsert(convo);
      return;
    }

    const chosen = products[idx - 1];

    const price = Number(chosen.amount);
    const currency = chosen.currency ?? "EUR";
    const localAmount = Number(chosen.localAmount ?? 0);
    const localCurrency = chosen.localCurrency ?? null;

    const pricing = pricingService.computePricing({
      rechargeAmount: price
    });

    const orderPublicId = randomPublicId("TX-");

    await repos.orders.createDraft({ publicId: orderPublicId, phoneHash, status: ORDER_STATUS.DRAFT });

    await repos.orders.update(orderPublicId, {
      status: ORDER_STATUS.DRAFT,
      operator_id: data.operatorId,
      operator_name: data.operatorName,
      country_code: data.countryCode,

      amount: price,
      currency,
      local_amount: localAmount,
      local_currency: localCurrency,

      fee: pricing.fee,
      total: pricing.total,

      phone_masked: data.phoneMasked,
      phone_enc: security.encrypt(data.phone),
      wa_to_enc: security.encrypt(from)
    });

    convo.state = STATES.WAITING_ORDER_CONFIRM;
    convo.stateData = {
      ...data,
      product: chosen,
      productLabel: chosen.name ?? "Forfait",
      price,
      currency,
      localAmount,
      localCurrency,
      fee: pricing.fee,
      total: pricing.total,
      reference: orderPublicId,
      orderPublicId
    };
    convo.lastUserAt = nowIso();
    await repos.conversations.upsert(convo);

    const msg = replyFormatter.format({
      language: convo.language,
      intent: INTENTS.ORDER_SUMMARY,
      data: {
        countryLabel: `${data.countryName} (${data.countryCode})`,
        phoneMasked: data.phoneMasked,
        operatorName: data.operatorName,
        serviceLabel: serviceLabelFromType(data.serviceType),
        productLabel: chosen.name ?? "Forfait",
        price,
        currency,
        localAmount,
        localCurrency,
        fee: pricing.fee,
        total: pricing.total,
        reference: orderPublicId
      }
    });

    await whatsappSender.sendText({ to: from, body: msg });
    await repos.messages.add({ phoneHash, direction: "OUT", type: "text", text: msg });
  }

  async function stepOrderConfirm({ from, phoneHash, convo, data, userText }) {
    if (isNo(userText)) {
      // retour liste produits
      convo.state = STATES.WAITING_AMOUNT;
      convo.lastUserAt = nowIso();
      await repos.conversations.upsert(convo);

      const msg = replyFormatter.format({
        language: convo.language,
        intent: INTENTS.ASK_PRODUCT,
        data: { products: data.products ?? [] }
      });

      await whatsappSender.sendText({ to: from, body: msg });
      await repos.messages.add({ phoneHash, direction: "OUT", type: "text", text: msg });
      return;
    }

    if (!isYes(userText)) {
      // réponse inattendue -> reset
      const msg = replyFormatter.format({
        language: convo.language,
        intent: INTENTS.FALLBACK_RESET,
        data: {}
      });

      await whatsappSender.sendText({ to: from, body: msg });
      await repos.messages.add({ phoneHash, direction: "OUT", type: "text", text: msg });

      convo.state = STATES.WAITING_COUNTRY;
      convo.stateData = {};
      convo.lastUserAt = nowIso();
      await repos.conversations.upsert(convo);
      return;
    }

    const orderPublicId = data.orderPublicId;
    if (!orderPublicId) {
      const msg = replyFormatter.format({
        language: convo.language,
        intent: INTENTS.FALLBACK_RESET,
        data: {}
      });
      await whatsappSender.sendText({ to: from, body: msg });
      await repos.messages.add({ phoneHash, direction: "OUT", type: "text", text: msg });
      return;
    }

    // idempotency paiement (évite double checkout)
    const lockOk = security.idempotency.tryLock(`pay:${orderPublicId}`, 60);
    if (!lockOk) {
      const msg = replyFormatter.format({
        language: convo.language,
        intent: INTENTS.PAYMENT_PENDING,
        data: { payUrl: data.payUrl ?? null }
      });
      await whatsappSender.sendText({ to: from, body: msg });
      await repos.messages.add({ phoneHash, direction: "OUT", type: "text", text: msg });
      return;
    }

    const chargeAmount = Number((Number(data.total ?? (data.price + data.fee)) || 0).toFixed(2));
    const chargeCurrency = data.currency ?? "EUR";

    const checkout = await sumupCheckout.createCheckout({
      conversationId: orderPublicId, // 🔑 reference SumUp
      amount: chargeAmount,          // ✅ TOTAL À PAYER
      currency: chargeCurrency,
      description: "Recharge mobile"
    });

    await repos.orders.update(orderPublicId, {
      status: ORDER_STATUS.PAYMENT_PENDING,
      sumup_checkout_id: checkout.checkoutId
    });

    convo.state = STATES.WAITING_PAYMENT;
    convo.stateData = { ...data, payUrl: checkout.checkoutUrl };
    convo.lastUserAt = nowIso();
    await repos.conversations.upsert(convo);

    const msg = replyFormatter.format({
      language: convo.language,
      intent: INTENTS.PAYMENT_LINK,
      data: { payUrl: checkout.checkoutUrl }
    });

    await whatsappSender.sendText({ to: from, body: msg });
    await repos.messages.add({ phoneHash, direction: "OUT", type: "text", text: msg });
  }

  // Webhook SumUp -> déclenche topup Reloadly
  async function handleSumUpEvent(event) {
    // Normaliser la source (SumUp envoie souvent {event_type, payload:{...}})
    const payload = event?.payload ?? event?.data ?? event ?? {};

    const eventType = String(event?.event_type ?? payload?.event_type ?? "").toLowerCase();
    const rawStatus = payload?.status ?? event?.status ?? "";
    const status = String(rawStatus).toUpperCase();

    const orderPublicId =
      payload?.checkout_reference ??
      payload?.reference ??
      event?.checkout_reference ??
      event?.reference ??
      null;

    if (!orderPublicId) return;

    const isPaid =
      eventType === "checkout.paid" ||
      ["PAID", "SUCCESS", "SUCCESSFUL", "CHECKOUT_COMPLETED"].includes(status);

    if (!isPaid) return;

    // idempotency webhook (un seul topup par order)
    if (!security.idempotency.tryLock(`sumup:paid:${orderPublicId}`, 300)) return;

    const order = await repos.orders.getByPublicId(orderPublicId);
    if (!order) return;

    await repos.orders.update(orderPublicId, { status: ORDER_STATUS.PROCESSING_TOPUP });

    // decrypt pour exécuter topup et notifier
    const phone = security.decrypt(order.phone_enc);
    const to = security.decrypt(order.wa_to_enc);

    const topup = await reloadlyTopup.topup({
      operatorId: order.operator_id,
      amount: Number(order.amount),     // ✅ montant recharge (pas le total)
      currency: order.currency ?? "EUR",
      phone,
      customIdentifier: orderPublicId   // ✅ idempotence côté Reloadly
    });

    await repos.orders.update(orderPublicId, {
      status: ORDER_STATUS.DONE,
      reloadly_transaction_id: String(topup?.transactionId ?? "")
    });

    // langue : on essaie de retrouver la conversation
    let lang = APP.DEFAULT_LANG ?? "fr";
    try {
      const phoneHash = order.phone_hash ?? sha256Hex(to);
      const convo = await repos.conversations.getByPhoneHash(phoneHash);
      lang = convo?.language ?? lang;
    } catch (e) {
      log?.debug?.({ err: String(e?.message ?? e) }, "post_topup_lang_lookup_failed");
    }

    const msg = replyFormatter.format({
      language: lang,
      intent: INTENTS.TOPUP_SUCCESS,
      data: { reference: orderPublicId }
    });

    await whatsappSender.sendText({ to, body: msg });

    // journaliser sortie sans PII
    try {
      await repos.messages.add({
        phoneHash: sha256Hex(to),
        direction: "OUT",
        type: "text",
        text: msg
      });
    } catch (e) {
      log?.debug?.({ err: String(e?.message ?? e) }, "out_message_log_failed");
    }
  }

  return {
    extractIncoming,
    handleIncoming,
    handleSumUpEvent
  };
}
