export function r2PublicUrl(pathOrUrl: string): string {
  const base =
    (process.env.R2_PUBLIC_BASE_URL || process.env.R2_PUBLIC_BASEURL || "").replace(/\/+$/, "");
  if (!base) return pathOrUrl;

  try {
    const u = new URL(pathOrUrl);
    return u.href; // already absolute
  } catch {
    /* not absolute, treat as key */
  }
  const key = String(pathOrUrl || "").replace(/^\/+/, "");
  return `${base}/${key}`;
}

export function getR2PublicBaseUrl(): string {
  const raw = (process.env.R2_PUBLIC_BASE_URL || process.env.R2_PUBLIC_BASEURL || "").trim();
  try {
    const u = new URL(raw);
    if (!u.protocol || !u.hostname) throw new Error("invalid");
    return u.toString().replace(/\/+$/, "");
  } catch {
    throw new Error("R2_PUBLIC_BASE_URL or R2_PUBLIC_BASEURL must be a valid absolute URL");
  }
}
