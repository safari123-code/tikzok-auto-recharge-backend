import "dotenv/config";

import { buildApp } from "./app.js";
import { loadEnv } from "./config/env.js";

import { startSumupPoller } from "./services/payments/sumup/sumup.poller.worker.js";
import { buildSumupPoller } from "./services/payments/sumup/sumup.poller.service.js";
import { buildSumUpClient } from "./services/payments/sumup/sumup.client.js";

import { buildReloadlyAuth } from "./services/recharge/reloadly/reloadly.auth.service.js";
import { buildReloadlyTopup } from "./services/recharge/reloadly/reloadly.topup.service.js";

import { buildStorage } from "./services/storage/index.js";
import { buildIdempotency } from "./services/security/idempotency.js";

const env = loadEnv();

async function start() {
  /**
   * 1️⃣ Bootstrap HTTP uniquement
   * AUCUNE route ici
   */
  const app = await buildApp({ env });

  const port = Number(process.env.PORT || 8080);
  await app.listen({ port, host: "0.0.0.0" });

  app.log.info({ port }, "🚀 server_started");

  /**
   * 2️⃣ Initialisations non bloquantes APRÈS listen
   */
  setImmediate(() => {
    try {
      const storage = buildStorage();
      const idempotency = buildIdempotency();

      const lock = {
        async with(key, fn) {
          const ok = idempotency.tryLock(key, 300);
          if (!ok) return;
          await fn();
        }
      };

      if (env.ENABLE_SUMUP_POLLER === "true") {
        const sumupClient = buildSumUpClient({ env, log: app.log });

        const reloadlyAuth = buildReloadlyAuth({ env, log: app.log });
        const reloadlyTopup = buildReloadlyTopup({
          env,
          log: app.log,
          getAccessToken: reloadlyAuth.getAccessToken
        });

        const sumupPoller = buildSumupPoller({
          sumupClient,
          reloadlyTopup,
          storage,
          lock,
          log: app.log
        });

        startSumupPoller({ sumupPoller, log: app.log });
        app.log.info("🔁 SumUp poller enabled");
      } else {
        app.log.info("⏸️ SumUp poller disabled");
      }
    } catch (err) {
      console.error("POST_START_ERROR", err);
    }
  });
}

start().catch((err) => {
  console.error("BOOT_ERROR", err);
  process.exit(1);
});
