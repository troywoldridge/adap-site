// src/lib/artworkUrl.ts
export function artworkUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ??
    process.env.R2_PUBLIC_BASE_URL ??
    "";
  return `${base.replace(/\/+$/, "")}/${String(path).replace(/^\/+/, "")}`;
}
