// backend/src/workers/sumup.poller.worker.js

export function startSumupPoller({ sumupPoller, log }) {
  const INTERVAL_MS = 15000; // 15 secondes

  log.info("🟢 SumUp poller démarré");

  setInterval(async () => {
    try {
      await sumupPoller.runOnce();
    } catch (err) {
      log.error({ err }, "Erreur dans SumUp poller");
    }
  }, INTERVAL_MS);
}
