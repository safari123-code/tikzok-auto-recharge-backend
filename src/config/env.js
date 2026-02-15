function must(v, key) {
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

export function loadEnv() {
  return {
    NODE_ENV: process.env.NODE_ENV ?? "development",
    PORT: Number(process.env.PORT ?? 8080),
    PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL ?? "http://localhost:8080",

    DATABASE_URL: process.env.DATABASE_URL ?? "",
    REDIS_URL: process.env.REDIS_URL ?? "",

    META_VERIFY_TOKEN: must(process.env.META_VERIFY_TOKEN, "META_VERIFY_TOKEN"),
    META_APP_SECRET: must(process.env.META_APP_SECRET, "META_APP_SECRET"),
    WHATSAPP_TOKEN: must(process.env.WHATSAPP_TOKEN, "WHATSAPP_TOKEN"),
    WHATSAPP_PHONE_NUMBER_ID: must(process.env.WHATSAPP_PHONE_NUMBER_ID, "WHATSAPP_PHONE_NUMBER_ID"),

    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
    OPENAI_MODEL_MAIN: process.env.OPENAI_MODEL_MAIN ?? "gpt-4o-mini",

    RELOADLY_CLIENT_ID: process.env.RELOADLY_CLIENT_ID ?? "",
    RELOADLY_CLIENT_SECRET: process.env.RELOADLY_CLIENT_SECRET ?? "",
    RELOADLY_BASE_URL: process.env.RELOADLY_BASE_URL ?? "https://topups.reloadly.com",
    RELOADLY_AUDIENCE: process.env.RELOADLY_AUDIENCE ?? "https://topups.reloadly.com",

    SUMUP_ACCESS_TOKEN: process.env.SUMUP_ACCESS_TOKEN ?? "",
    SUMUP_MERCHANT_CODE: process.env.SUMUP_MERCHANT_CODE ?? "",
    SUMUP_WEBHOOK_SECRET: process.env.SUMUP_WEBHOOK_SECRET ?? "",

    DATA_ENCRYPTION_KEY: process.env.DATA_ENCRYPTION_KEY ?? ""
  };
}
