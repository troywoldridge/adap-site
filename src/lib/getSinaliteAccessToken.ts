// src/lib/getSinaliteAccessToken.ts
type TokenResponse = {
  access_token: string;
  token_type: string; // "Bearer"
  expires_in?: number; // seconds (if provided)
};

let cachedBearer = "";
let expiresAt = 0; // epoch ms

export async function getSinaliteAccessToken(): Promise<string> {
  const now = Date.now();
  // Reuse token if still valid (with a 60s safety margin)
  if (cachedBearer && now < expiresAt - 60_000) {
    return cachedBearer;
  }

  const url =
    process.env.SINALITE_AUTH_URL ||
    "https://api.sinaliteuppy.com/auth/token";

  const client_id = process.env.SINALITE_CLIENT_ID!;
  const client_secret = process.env.SINALITE_CLIENT_SECRET!;
  const audience =
    process.env.SINALITE_AUDIENCE || "https://apiconnect.sinalite.com";
  const grant_type = "client_credentials";

  if (!client_id || !client_secret) {
    throw new Error("Missing SINALITE_CLIENT_ID / SINALITE_CLIENT_SECRET");
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ client_id, client_secret, audience, grant_type }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `Sinalite auth failed: ${res.status} ${res.statusText} ${txt}`.trim()
    );
  }

  const data = (await res.json()) as TokenResponse;
  if (!data.access_token || !data.token_type) {
    throw new Error("Invalid Sinalite token response");
  }

  cachedBearer = `${data.token_type} ${data.access_token}`;

  // Prefer expires_in when provided; default to ~20 minutes
  const ttlSec = typeof data.expires_in === "number" ? data.expires_in : 1200;
  expiresAt = now + ttlSec * 1000;

  return cachedBearer;
}
