// src/lib/r2-public.ts
export function r2PublicUrl(pathOrUrl: string): string {
  const base = process.env.R2_PUBLIC_BASEURL?.replace(/\/+$/, "") || "";
  if (!base) return pathOrUrl; // last-resort pass-through

  try {
    // If a full URL, keep it (lets you store absolute URLs too).
    const u = new URL(pathOrUrl);
    return u.href;
  } catch {
    // Not a full URL → treat as a key/path
  }
  const key = pathOrUrl.replace(/^\/+/, "");
  return `${base}/${key}`;
}
