import { getR2PublicBaseUrl } from "./r2Public";

const DEV = process.env.NODE_ENV !== "production";
const BASE = getR2PublicBaseUrl();
const DIRECT_HTTPS = process.env.R2_DIRECT_HOST ? `https://${process.env.R2_DIRECT_HOST}` : "";

export function toProxyArtworkUrl(input: string): string {
  const raw = String(input || "").trim();
  if (!raw) return "";

  try {
    const u = new URL(raw);
    if (DEV && u.hostname === "cdn.adap.com") {
      return `${BASE}${u.pathname}`;
    }
    return u.toString();
  } catch {
    // not absolute
  }

  if (raw.startsWith("/")) return `${BASE}${raw}`;
  return raw;
}
