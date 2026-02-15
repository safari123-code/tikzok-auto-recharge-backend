export function buildOrderRepo({ store }) {
  return {
    async createDraft(row) {
      store.orders.set(row.publicId, row);
      return row;
    },
    async update(publicId, patch) {
      const prev = store.orders.get(publicId) ?? { publicId };
      const next = { ...prev, ...patch };
      store.orders.set(publicId, next);
      return next;
    },
    async getByPublicId(publicId) {
      return store.orders.get(publicId) ?? null;
    }
  };
}
