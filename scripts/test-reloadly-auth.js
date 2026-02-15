import "dotenv/config";
import axios from "axios";

async function testAuth() {
  const res = await axios.post(
    "https://auth.reloadly.com/oauth/token",
    {
      client_id: process.env.RELOADLY_CLIENT_ID,
      client_secret: process.env.RELOADLY_CLIENT_SECRET,
      grant_type: "client_credentials",
      audience: "https://topups.reloadly.com", // PROD STRICT
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  console.log("✅ Token Reloadly PROD OK");
  console.log(res.data.access_token.slice(0, 20) + "...");
}

testAuth().catch((err) => {
  console.error("❌ Auth Reloadly PROD KO");
  console.error(err?.response?.data || err.message);
});
