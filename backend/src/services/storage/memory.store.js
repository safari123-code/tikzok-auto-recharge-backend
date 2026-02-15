export function buildMemoryStore() {
  return {
    conversations: new Map(),
    orders: new Map(),
    messages: []
  };
}
