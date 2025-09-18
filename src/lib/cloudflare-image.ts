// src/lib/cloudflare-image.ts
// Back-compat tiny wrapper. Prefer importing from src/lib/cfImages instead.

import { cfImage as _cfImage } from "./cfImages";

/** Build Cloudflare Images delivery URL from an ID or pass-through URL. */
export function cfImageUrl(imageId: string, variant?: string): string | null {
  if (!imageId) return null;
  // We accept any variant string; cfImages will warn if it's unknown.
  const out = _cfImage(imageId, (variant as any) ?? "public");
  return out || null;
}

export default cfImageUrl;
