import "dotenv/config";

import OpenAI from "openai";

async function test() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY manquante");
    process.exit(1);
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "Réponds uniquement par OK" }],
  });

  console.log("✅ Réponse OpenAI :", res.choices[0].message.content);
}

test().catch((err) => {
  console.error("❌ Erreur OpenAI");
  console.error(err?.message || err);
});
