# tikzok_auto_recharge backend

## Run (Windows)
1) Copy `.env.example` to `.env` and fill values
2) `npm install`
3) `npm start`
4) Health: GET http://localhost:8080/health

## Webhooks (dev simulation)
- POST /webhook/whatsapp with JSON: {"from":"+33611111111","text":"hello"}
- POST /webhook/sumup with JSON: {"checkout_reference":"TX-...","status":"PAID"}

## Notes
- OpenAI is used only for language detection (services/openai/openai.language.js)
- Reply formatting is deterministic (services/whatsapp/reply.formatter.js)
- Sensitive values: masked in logs; full phone is encrypted (AES-256-GCM) at rest
