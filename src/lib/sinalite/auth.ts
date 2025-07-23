// src/lib/sinalite/auth.ts

let cachedToken: string | undefined;
let tokenExpiry = 0;

export async function getSinaliteToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  const response = await fetch(`${process.env.SINALITE_API_BASE}/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.SINALITE_CLIENT_ID,
      client_secret: process.env.SINALITE_CLIENT_SECRET,
      audience: process.env.SINALITE_AUDIENCE ?? 'https://apiconnect.sinalite.com',
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to obtain Sinalite access token');
  }

  const {
    access_token,
    token_type,
    expires_in,
  }: {
    access_token: string;
    token_type: string;
    expires_in: number;
  } = await response.json();

  cachedToken = `${token_type} ${access_token}`;
  tokenExpiry = now + (expires_in - 30) * 1000;

  return cachedToken;
}
