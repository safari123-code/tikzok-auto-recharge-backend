import { sumupController } from "../controllers/sumup.controller.js";
import { verifySumupSignature } from "../middleware/verifySumupSignature.js";

export default async function sumupRoutes(app, { env }) {
  app.post(
    "/webhook/sumup",
    { preHandler: [verifySumupSignature(env)] },
    sumupController({ env, log: app.log })
  );
}
