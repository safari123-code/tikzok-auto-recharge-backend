export function buildWhatsAppParser() {
  function extractIncoming(body) {
    // DEV simulation: {from, text}
    if (body?.from && body?.text) {
      return { from: body.from, type: "text", text: body.text, messageId: body.messageId ?? null };
    }

    // TODO: parse real Meta payload (Cloud API)
    return null;
  }

  return { extractIncoming };
}
