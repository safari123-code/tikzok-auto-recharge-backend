import { request } from "undici";

export function buildSumUpAuth({ env }) {

  async function getAccessToken() {
    const res = await request("https://api.sumup.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: env.SUMUP_CLIENT_ID,
        client_secret: env.SUMUP_CLIENT_SECRET
      }).toString()
    });

    const data = await res.body.json();
    return data.access_token;
  }

  return { getAccessToken };
}
