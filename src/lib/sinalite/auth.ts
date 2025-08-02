// src/lib/sinalite/auth.ts

let cachedToken: string | undefined;
let tokenExpiry = 0;

export async function getSinaliteToken(): Promise<string> {
  const now = Date.now();

  // Return cached if still valid
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  const base = process.env.SINALITE_API_BASE;
  const clientId = process.env.SINALITE_CLIENT_ID;
  const clientSecret = process.env.SINALITE_CLIENT_SECRET;
  const audience = process.env.SINALITE_AUDIENCE ?? "https://apiconnect.sinalite.com";

  if (!base) {
    console.warn("⚠️ SINALITE_API_BASE not set; skipping token fetch and returning empty string.");
    return "";
  }
  if (!clientId || !clientSecret) {
    console.warn("⚠️ SINALITE_CLIENT_ID or SINALITE_CLIENT_SECRET missing; skipping token fetch and returning empty string.");
    return "";
  }

  const url = `${base.replace(/\/+$/, "")}/auth/token`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        audience,
        grant_type: "client_credentials",
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.warn(
        `⚠️ Sinalite auth responded with non-ok status: ${response.status} ${response.statusText} - ${text}`
      );
      return ""; // swallow and return empty
    }

    const data: {
      access_token?: string;
      token_type?: string;
      expires_in?: number;
    } = await response.json();

    if (!data.access_token || !data.token_type || !data.expires_in) {
      console.warn("⚠️ Unexpected token response shape from Sinalite:", data);
      return "";
    }

    cachedToken = `${data.token_type} ${data.access_token}`;
    tokenExpiry = now + (data.expires_in - 30) * 1000; // cushion 30s

    return cachedToken;
  } catch (err) {
    console.warn("⚠️ Failed to fetch Sinalite token (silenced):", err);
    return "";
  }
}
