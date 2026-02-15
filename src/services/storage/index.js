// src/services/storage/index.js
import { buildOrderRepo } from "./repositories/order.repo.js";
import { buildMemoryStore } from "./memory.store.js";

export function buildStorage() {
  const store = buildMemoryStore();
  const orderRepo = buildOrderRepo({ store });

  return {
    async getWaitingOrders() {
      return Array.from(store.orders.values()).filter(
        (o) => o.state === "WAITING_PAYMENT"
      );
    },

    getById(publicId) {
      return orderRepo.getByPublicId(publicId);
    },

    update(publicId, patch) {
      return orderRepo.update(publicId, patch);
    }
  };
}
