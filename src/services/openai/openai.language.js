const ALLOWED = ["en", "fr", "tr", "ar", "es"];

export function buildLanguageDetector({ openaiClient, log }) {
  async function detectLanguage(text) {
    const t = (text ?? "").trim();
    if (t.length < 4) return null;

    try {
      const resp = await openaiClient.chat?.({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 6,
        messages: [
          { role: "system", content: "Return ONLY ISO 639-1 language code (en, fr, tr, ar). No text." },
          { role: "user", content: t }
        ]
      });

      let code = resp?.choices?.[0]?.message?.content?.trim()?.toLowerCase() ?? null;
      if (!code) return null;
      if (code.includes("-")) code = code.split("-")[0];
      if (!ALLOWED.includes(code)) return null;

      return code;
    } catch (err) {
      log?.warn({ err }, "language_detection_failed");
      return null;
    }
  }

  return { detectLanguage };
}
