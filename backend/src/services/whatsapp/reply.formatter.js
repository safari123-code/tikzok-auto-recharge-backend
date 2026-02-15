import { APP } from "../../config/constants.js";

export function buildReplyFormatter() {
  function format({ language = APP.DEFAULT_LANG, intent, data = {} }) {
    switch (intent) {
      case "ASK_COUNTRY": return askCountry(language, data);
      case "ASK_PHONE": return askPhone(language);
      case "INVALID_PHONE": return invalidPhone(language);
      case "CONFIRM_OPERATOR": return confirmOperator(language, data);
      case "ASK_SERVICE_TYPE": return askServiceType(language);
      case "ASK_PRODUCT": return askProduct(language, data);
      case "ORDER_SUMMARY": return orderSummary(language, data);
      case "PAYMENT_LINK": return paymentLink(language, data);
      case "PAYMENT_PENDING": return paymentPending(language);
      case "TOPUP_SUCCESS": return topupSuccess(language);
      default: return fallback(language);
    }
  }

  return { format };
}

function askCountry(lang, { topCountries = [] }) {
  const list = topCountries.map((c, i) => `${i + 1}️⃣ ${c.name} (${c.isoName})`).join("\n");
  if (lang === "fr") return `🌍 Choisissez le pays de recharge :\n\n${list}\n\nOu écrivez le nom du pays.`;
  if (lang === "tr") return `🌍 Ülkeyi seçin:\n\n${list}\n\nVeya ülke adını yazın.`;
  if (lang === "ar") return `🌍 اختر الدولة:\n\n${list}\n\nأو اكتب اسم الدولة.`;
  return `🌍 Choose the recharge country:\n\n${list}\n\nOr type the country name.`;
}

function askPhone(lang) {
  if (lang === "fr") return `📱 Entrez le numéro à recharger\nEx: +33612345678`;
  if (lang === "tr") return `📱 Yüklenecek numarayı girin\nÖrnek: +905xxxxxxxx`;
  if (lang === "ar") return `📱 أدخل رقم الهاتف\nمثال: +905xxxxxxxx`;
  return `📱 Enter the phone number\nExample: +33612345678`;
}

function invalidPhone(lang) {
  if (lang === "fr") return `❌ Numéro invalide. Réessayez.`;
  if (lang === "tr") return `❌ Geçersiz numara. Tekrar deneyin.`;
  if (lang === "ar") return `❌ رقم غير صالح. حاول مرة أخرى.`;
  return `❌ Invalid phone number. Please try again.`;
}

function confirmOperator(lang, { operatorName, phoneMasked }) {
  if (lang === "fr") return `📡 Opérateur détecté : ${operatorName}\nNuméro : ${phoneMasked}\n\nConfirmez-vous ?\nOUI / NON`;
  if (lang === "tr") return `📡 Operatör: ${operatorName}\nNumara: ${phoneMasked}\n\nOnaylıyor musunuz?\nEVET / HAYIR`;
  if (lang === "ar") return `📡 الشركة: ${operatorName}\nالرقم: ${phoneMasked}\n\nهل تؤكد؟\nنعم / لا`;
  return `📡 Operator: ${operatorName}\nNumber: ${phoneMasked}\n\nConfirm?\nYES / NO`;
}

function askServiceType(lang) {
  if (lang === "fr") return `📱 Que souhaitez-vous recharger ?\n\n1️⃣ Crédit mobile\n2️⃣ Internet\n3️⃣ Minutes`;
  if (lang === "tr") return `📱 Ne yüklemek istiyorsunuz?\n\n1️⃣ Mobil bakiye\n2️⃣ İnternet\n3️⃣ Dakika`;
  if (lang === "ar") return `📱 ماذا تريد شحنه؟\n\n1️⃣ رصيد\n2️⃣ إنترنت\n3️⃣ دقائق`;
  return `📱 What would you like to recharge?\n\n1️⃣ Mobile credit\n2️⃣ Internet\n3️⃣ Minutes`;
}

function askProduct(lang, { products = [] }) {
  const list = products.map((p, i) => `${i + 1}️⃣ ${p.name} - ${p.amount} ${p.currency}`).join("\n");
  if (lang === "fr") return `💳 Choisissez un montant / forfait :\n\n${list}`;
  if (lang === "tr") return `💳 Paket seçin:\n\n${list}`;
  if (lang === "ar") return `💳 اختر الباقة:\n\n${list}`;
  return `💳 Choose a package:\n\n${list}`;
}

function orderSummary(lang, d) {
  const price = Number(d.price ?? 0);
  const fee = Number(d.fee ?? 0);
  const total = (price + fee).toFixed(2);

  if (lang === "fr") {
    return `📋 Résumé commande

────────────────────
Pays : ${d.countryLabel}
Numéro : ${d.phoneMasked}
Opérateur : ${d.operatorName}
Service : ${d.serviceLabel}
Forfait : ${d.productLabel}
────────────────────
Prix : ${d.price} €
Frais service : ${d.fee} €
────────────────────
Total à payer : ${total} €
────────────────────
Référence : ${d.reference}

Confirmez-vous ?

OUI / NON`;
  }

  if (lang === "tr") {
    return `📋 Sipariş Özeti

────────────────────
Ülke : ${d.countryLabel}
Numara : ${d.phoneMasked}
Operatör : ${d.operatorName}
Servis : ${d.serviceLabel}
Paket : ${d.productLabel}
────────────────────
Fiyat : ${d.price} €
Hizmet ücreti : ${d.fee} €
────────────────────
Toplam : ${total} €
────────────────────
Referans : ${d.reference}

Onaylıyor musunuz?

EVET / HAYIR`;
  }

  if (lang === "ar") {
    return `📋 ملخص الطلب

────────────────────
الدولة : ${d.countryLabel}
الرقم : ${d.phoneMasked}
الشركة : ${d.operatorName}
الخدمة : ${d.serviceLabel}
الباقة : ${d.productLabel}
────────────────────
السعر : ${d.price} €
رسوم الخدمة : ${d.fee} €
────────────────────
الإجمالي : ${total} €
────────────────────
المرجع : ${d.reference}

هل تؤكد الطلب؟

نعم / لا`;
  }

  return `📋 Order Summary

────────────────────
Country : ${d.countryLabel}
Number : ${d.phoneMasked}
Operator : ${d.operatorName}
Service : ${d.serviceLabel}
Package : ${d.productLabel}
────────────────────
Price : ${d.price} €
Service fee : ${d.fee} €
────────────────────
Total : ${total} €
────────────────────
Reference : ${d.reference}

Confirm?

YES / NO`;
}

function paymentLink(lang, { payUrl }) {
  if (lang === "fr") return `💳 Veuillez payer via ce lien sécurisé :\n${payUrl}`;
  if (lang === "tr") return `💳 Güvenli ödeme bağlantısı:\n${payUrl}`;
  if (lang === "ar") return `💳 رابط الدفع الآمن:\n${payUrl}`;
  return `💳 Please pay using this secure link:\n${payUrl}`;
}

function paymentPending(lang) {
  if (lang === "fr") return `⏳ Paiement en cours de vérification.`;
  if (lang === "tr") return `⏳ Ödeme kontrol ediliyor.`;
  if (lang === "ar") return `⏳ جارٍ التحقق من الدفع.`;
  return `⏳ Payment is being verified.`;
}

function topupSuccess(lang) {
  if (lang === "fr") return `✅ Recharge réussie. Merci.`;
  if (lang === "tr") return `✅ Yükleme başarılı. Teşekkürler.`;
  if (lang === "ar") return `✅ تم الشحن بنجاح. شكراً لك.`;
  return `✅ Top-up successful. Thank you.`;
}

function fallback(lang) {
  if (lang === "fr") return `❓ Je n'ai pas compris. Recommençons.`;
  if (lang === "tr") return `❓ Anlayamadım. Baştan başlayalım.`;
  if (lang === "ar") return `❓ لم أفهم. لنبدأ من جديد.`;
  return `❓ I didn't understand. Let's start again.`;
}
