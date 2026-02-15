-- Optional DB schema. This project runs with memory repos if DB is unavailable.

CREATE TABLE IF NOT EXISTS conversations (
  phone_hash TEXT PRIMARY KEY,
  language TEXT NOT NULL,
  state TEXT NOT NULL,
  state_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_user_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  public_id TEXT PRIMARY KEY,
  phone_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  operator_id BIGINT,
  operator_name TEXT,
  country_code TEXT,
  currency TEXT,
  amount NUMERIC,
  fee NUMERIC,
  phone_masked TEXT,
  phone_enc TEXT,
  wa_to_enc TEXT,
  sumup_checkout_id TEXT,
  reloadly_transaction_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  phone_hash TEXT NOT NULL,
  direction TEXT NOT NULL,
  type TEXT NOT NULL,
  text TEXT,
  provider_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
