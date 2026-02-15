export function buildWhatsAppSender({ env, log }) {
  async function sendText({ to, body }) {
    // DEV: log only. Replace with WhatsApp Cloud API call (undici).
    log.info({ toMasked: "****" + String(to).slice(-4), body }, "whatsapp_sendText_stub");
  }

  return { sendText };
}
