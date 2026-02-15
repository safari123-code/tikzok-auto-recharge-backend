export function buildMessageRepo({ store }) {
  return {
    async add(msg) {
      store.messages.push({ ...msg, at: new Date().toISOString() });
    }
  };
}
