// backend/src/payments/sumup/sumup.poller.service.js

/**
 * Rôle :
 * - Scanner les commandes WAITING_PAYMENT
 * - Vérifier l'état SumUp
 * - Déclencher Reloadly UNE SEULE FOIS si PAID
 *
 * Dépendances injectées :
 * - sumupClient.getCheckout(checkoutId)
 * - reloadlyTopup.topup(...)
 * - storage (getWaitingOrders, getById, update)
 * - lock.with(key, fn)
 * - log
 */

export function buildSumupPoller({
  sumupClient,
  reloadlyTopup,
  storage,
  lock,
  log
}) {
  /**
   * Traite UNE commande
   */
  async function processOrder(order) {
    // Sécurité minimale
    if (!order.checkoutId || !order.orderId) {
      log.warn(
        { orderId: order.orderId },
        "order_invalid_missing_checkout"
      );
      return;
    }

    // 1️⃣ Lire l'état du checkout SumUp
    let checkout;
    try {
      checkout = await sumupClient.getCheckout(order.checkoutId);
    } catch (err) {
      log.error(
        { err, orderId: order.orderId },
        "sumup_getCheckout_failed"
      );
      return;
    }

    // 2️⃣ Pas payé → on ignore
    if (checkout.status !== "PAID") {
      return;
    }

    // 3️⃣ Vérifications strictes (anti fraude / bug)
    if (checkout.checkout_reference !== order.orderId) {
      log.error(
        { orderId: order.orderId, checkout },
        "sumup_reference_mismatch"
      );
      return;
    }

    if (Number(checkout.amount) !== Number(order.amount)) {
      log.error(
        { orderId: order.orderId, checkout },
        "sumup_amount_mismatch"
      );
      return;
    }

    // 4️⃣ Verrou idempotent (anti double recharge)
    await lock.with(`order:${order.orderId}`, async () => {
      const fresh = await storage.getById(order.orderId);

      // Déjà traité → STOP
      if (!fresh || fresh.state === "TOPUP_CONFIRMED") {
        return;
      }

      // 5️⃣ Marquer le paiement confirmé
      await storage.update(order.orderId, {
        state: "PAYMENT_CONFIRMED",
        paidAt: new Date().toISOString()
      });

      let topupResult;

      // 6️⃣ Recharge Reloadly (protégée par flag)
      if (process.env.RELOADLY_ENABLED === "true") {
        try {
          topupResult = await reloadlyTopup.topup({
            operatorId: fresh.operatorId,
            amount: fresh.amount,
            phone: fresh.phoneDecrypted,
            countryCode: fresh.countryCode,
            customIdentifier: fresh.orderId // idempotence Reloadly
          });

          log.info(
            { orderId: fresh.orderId },
            "reloadly_topup_executed"
          );
        } catch (err) {
          log.error(
            { err, orderId: fresh.orderId },
            "reloadly_topup_failed"
          );
          return;
        }
      } else {
        // 🔒 Mode test sécurisé
        log.warn(
          {
            orderId: fresh.orderId,
            operatorId: fresh.operatorId,
            amount: fresh.amount
          },
          "reloadly_disabled_would_execute_topup"
        );

        // Fake result pour finaliser le flow
        topupResult = {
          transactionId: "RELOADLY_DISABLED"
        };
      }

      // 7️⃣ Finaliser la commande
      await storage.update(order.orderId, {
        state: "TOPUP_CONFIRMED",
        reloadlyTransactionId: topupResult.transactionId,
        completedAt: new Date().toISOString()
      });

      log.info(
        {
          orderId: order.orderId,
          reloadlyTransactionId: topupResult.transactionId
        },
        "order_fully_completed"
      );
    });
  }

  /**
   * Traite toutes les commandes en attente
   */
  async function runOnce() {
    const waitingOrders = await storage.getWaitingOrders();

    for (const order of waitingOrders) {
      try {
        await processOrder(order);
      } catch (err) {
        log.error(
          { err, orderId: order.orderId },
          "sumup_poller_unhandled_error"
        );
      }
    }
  }

  return {
    runOnce
  };
}
