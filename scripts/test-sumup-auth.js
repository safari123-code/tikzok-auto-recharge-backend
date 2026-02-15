import "dotenv/config";
import { loadEnv } from "../src/config/env.js";
import { request } from "undici";

const env = loadEnv();

async function run() {
  const res = await request("https://api.sumup.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: env.SUMUP_CLIENT_ID,
      client_secret: env.SUMUP_CLIENT_SECRET
    }).toString()
  });

  const data = await res.body.json();

  if (res.statusCode >= 400) {
    console.error("❌ Auth SumUp KO :", data);
    return;
  }

  console.log("✅ ACCESS TOKEN OK");
  console.log(data.access_token);
}

run().catch(console.error);
