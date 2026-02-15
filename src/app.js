import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import formbody from "@fastify/formbody";
import fastifyRateLimit from "@fastify/rate-limit";

import { buildLogger } from "./config/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { rawBodyPlugin } from "./middleware/rawBody.js";
import { buildRateLimitOptions } from "./middleware/rateLimit.js";

import healthRoutes from "./routes/health.routes.js";
import whatsappRoutes from "./routes/webhook.whatsapp.js";
import sumupRoutes from "./routes/webhook.sumup.js";

export async function buildApp({ env }) {
  const app = Fastify({
    logger: buildLogger(env)
  });

  // Sécurité & CORS
  await app.register(cors, { origin: true });
  await app.register(helmet);

  // Body parsing
  await app.register(formbody);

  // Raw body requis pour la vérification de signatures (Meta / SumUp)
  await app.register(rawBodyPlugin);

  // Rate limiting global
  await app.register(fastifyRateLimit, buildRateLimitOptions(env));

  // Gestion centralisée des erreurs
  app.setErrorHandler(errorHandler);

  // Routes (UNE SEULE déclaration par route)
  await app.register(healthRoutes);          // GET /health
  await app.register(whatsappRoutes, { env });// Webhook WhatsApp
  await app.register(sumupRoutes, { env });  // Webhook SumUp

  return app;
}
