export async function getSinaliteAccessToken() {
  const res = await fetch("https://api.sinaliteuppy.com/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SINALITE_CLIENT_ID!,
      client_secret: process.env.SINALITE_CLIENT_SECRET!,
      audience: "https://apiconnect.sinalite.com",
      grant_type: "client_credentials"
    }),
    cache: "no-store"
  });
  if (!res.ok) {
    throw new Error("Failed to get Sinalite access token");
  }
  const json = await res.json();
  return `${json.token_type} ${json.access_token}`;
}
