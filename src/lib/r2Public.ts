// src/lib/r2Public.ts
export function getR2PublicBaseUrl(): string {
  const val =
    process.env.R2_PUBLIC_BASEURL || // old name
    process.env.R2_PUBLIC_BASE_URL || // new name
    "";

  try {
    const u = new URL(val);
    if (!u.protocol || !u.hostname) throw new Error("invalid");
    return u.toString().replace(/\/+$/, ""); // strip trailing slash
  } catch {
    throw new Error("R2_PUBLIC_BASE_URL or R2_PUBLIC_BASEURL must be a valid absolute URL");
  }
}
