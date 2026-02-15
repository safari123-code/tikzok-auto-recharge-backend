import { whatsappController } from "../controllers/whatsapp.controller.js";
import { verifyMetaSignature } from "../middleware/verifyMetaSignature.js";

export default async function whatsappRoutes(app, { env }) {
  // Meta verification handshake
  app.get("/webhook/whatsapp", async (req, reply) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === env.META_VERIFY_TOKEN) {
      reply.code(200).send(challenge);
      return;
    }
    reply.code(403).send("Forbidden");
  });

  app.post(
    "/webhook/whatsapp",
    { preHandler: [verifyMetaSignature(env)] },
    whatsappController({ env, log: app.log })
  );
}
