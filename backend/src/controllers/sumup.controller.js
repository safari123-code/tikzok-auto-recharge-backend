import { buildConversationService } from "../services/conversations/conversation.service.js";
import { buildWhatsAppParser } from "../services/whatsapp/whatsapp.parser.js";
import { buildWhatsAppSender } from "../services/whatsapp/whatsapp.sender.js";
import { buildReplyFormatter } from "../services/whatsapp/reply.formatter.js";

import { buildLanguageDetector } from "../services/openai/openai.language.js";
import { buildOpenAIClient } from "../services/openai/openai.client.js";

import { buildReloadlyCatalog } from "../services/recharge/reloadly/reloadly.catalog.service.js";
import { buildReloadlyTopup } from "../services/recharge/reloadly/reloadly.topup.service.js";

import { buildSumUpCheckoutService } from "../services/payments/sumup/sumup.checkout.service.js";
import { buildSumUpClient } from "../services/payments/sumup/sumup.client.js";

import { buildSecurity } from "../services/security/crypto.service.js";
import { buildRepos } from "../services/storage/repositories/index.js";

export function sumupController({ env, log }) {
  const repos = buildRepos({ env, log });

  const whatsappParser = buildWhatsAppParser();
  const whatsappSender = buildWhatsAppSender({ env, log });
  const replyFormatter = buildReplyFormatter();

  const openaiClient = buildOpenAIClient({ env, log });
  const languageDetector = buildLanguageDetector({ openaiClient, log });

  const reloadlyCatalog = buildReloadlyCatalog({ env, log });
  const reloadlyTopup = buildReloadlyTopup({ env, log });

  // ✅ SumUp OAuth client
  const sumupClient = buildSumUpClient({ env, log });

  const sumupCheckout = buildSumUpCheckoutService({
    env,
    log,
    getAccessToken: sumupClient.getAccessToken
  });

  const security = buildSecurity({ env, log });

  const convoService = buildConversationService({
    repos,
    whatsappSender,
    whatsappParser,
    replyFormatter,
    languageDetector,
    reloadlyCatalog,
    reloadlyTopup,
    sumupCheckout,
    security,
    env,
    log
  });

  return async function handler(req, reply) {
    try {
      // 🔐 recommandé en prod
      // await security.verifySumUpSignature(req);

      await convoService.handleSumUpEvent(req.body);
    } catch (err) {
      log.error({ err }, "sumup_webhook_error");
    }

    // ⚠️ Toujours ACK SumUp
    return reply.code(200).send({ ok: true });
  };
}
