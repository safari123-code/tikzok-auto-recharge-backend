export function buildConversationRepo({ store }) {
  return {
    async getByPhoneHash(phoneHash) {
      return store.conversations.get(phoneHash) ?? null;
    },
    async upsert(row) {
      store.conversations.set(row.phoneHash, row);
      return row;
    }
  };
}
