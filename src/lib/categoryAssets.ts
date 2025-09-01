import rawAssets from "@/data/categoryAssets.json";

type CategoryAsset = {
  imageId?: string;
  variant?: string;
  imageUrl?: string;
  description?: string;
};

const assets = rawAssets as Record<string, CategoryAsset>;

/** normalize a label/slug into dashed-lowercase */
function norm(input: string) {
  return input
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** try common alternates (e.g., labels-and-packaging vs labels-packaging) */
function alternates(base: string) {
  const set = new Set<string>([base]);
  if (base.includes("-and-")) set.add(base.replace("-and-", "-"));
  if (!base.includes("-and-")) set.add(base.replace("-", "-and-"));
  return Array.from(set);
}

/** get an asset by any reasonable slug/title input */
export function getCategoryAsset(key: string): CategoryAsset | null {
  const normalized = norm(key);
  const tries = [normalized, ...alternates(normalized)];
  for (const k of tries) {
    const hit = assets[k];
    if (hit) return hit;
  }
  return null;
}
