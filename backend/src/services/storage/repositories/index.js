import { buildMemoryStore } from "../memory.store.js";
import { tryConnectDb } from "../db.js";
import { buildConversationRepo } from "./conversation.repo.js";
import { buildOrderRepo } from "./order.repo.js";
import { buildMessageRepo } from "./message.repo.js";

export function buildRepos({ env, log }) {
  const store = buildMemoryStore();

  // Optional DB connectivity check (still uses memory repos for this version)
  tryConnectDb({ env, log }).then((pool) => {
    if (!pool) log.warn("using_memory_repositories");
  });

  return {
    conversations: buildConversationRepo({ store }),
    orders: buildOrderRepo({ store }),
    messages: buildMessageRepo({ store })
  };
}
