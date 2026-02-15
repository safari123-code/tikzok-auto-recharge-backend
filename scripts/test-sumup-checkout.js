import "dotenv/config";
import { loadEnv } from "../src/config/env.js";
import { request } from "undici";

const env = loadEnv();

// ⚠️ ID DE COMMANDE EXISTANT
const ORDER_ID = "ORDER_TEST_001";

async function run() {
  const res = await request("https://api.sumup.com/v0.1/checkouts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.SUMUP_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      checkout_reference: ORDER_ID,
      amount: 0.5,
      currency: "EUR",
      pay_to_email: env.SUMUP_MERCHANT_EMAIL,
      description: "Test recharge Tikzok",
      redirect_url: "https://tikzok.com/payment-success"
    })
  });

  const data = await res.body.json();

  if (res.statusCode >= 400) {
    console.error("❌ Erreur SumUp :", data);
    return;
  }

  console.log("✅ Checkout créé");
  console.log("👉 Ouvre ce lien pour payer :");
  console.log(data.checkout_url);
}

run().catch(console.error);
