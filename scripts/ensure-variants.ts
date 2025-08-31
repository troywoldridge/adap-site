// scripts/ensure-variants.ts
// Run with: npx tsx scripts/ensure-variants.ts
// Env needed (either style is fine):
//   CLOUDFLARE_ACCOUNT_ID or CF_ACCOUNT_ID
//   CLOUDFLARE_API_TOKEN  or CF_API_TOKEN
//
// Token scopes: Images - Read & Write

const ACCOUNT_ID =
  process.env.CLOUDFLARE_ACCOUNT_ID ||
  process.env.CF_ACCOUNT_ID ||
  "";

const API_TOKEN =
  process.env.CLOUDFLARE_API_TOKEN ||
  process.env.CF_API_TOKEN ||
  "";

if (!ACCOUNT_ID || !API_TOKEN) {
  console.error("❌ Missing CLOUDFLARE_ACCOUNT_ID/CF_ACCOUNT_ID or CLOUDFLARE_API_TOKEN/CF_API_TOKEN");
  process.exit(1);
}

type VariantDef = {
  id: string;
  options: {
    fit: "contain" | "cover";
    width: number;
    height: number;
    quality?: number;
    format?: "auto" | "jpeg" | "png" | "webp" | "avif";
    metadata?: "none" | "copyright";
  };
  neverRequireSignedURLs: boolean;
};

const desired: VariantDef[] = [
  {
    id: "hero",
    options: { fit: "contain", width: 1400, height: 260, format: "auto", quality: 85, metadata: "none" },
    neverRequireSignedURLs: true,
  },
  {
    id: "sale-card",
    options: { fit: "contain", width: 640, height: 260, format: "auto", quality: 85, metadata: "none" },
    neverRequireSignedURLs: true,
  },
  {
    id: "category",
    options: { fit: "contain", width: 360, height: 360, format: "auto", quality: 85, metadata: "none" },
    neverRequireSignedURLs: true,
  },
];

async function cf<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!("success" in json) || !json.success) {
    const msg = JSON.stringify(json.errors || json, null, 2);
    throw new Error(`${res.status} ${res.statusText} :: ${msg}`);
  }
  return json.result as T;
}

type GetVariantsResult = { variants: any[] } | any[];

async function getVariants(): Promise<any[]> {
  const result = await cf<GetVariantsResult>("/images/v1/variants");
  // Some SDKs return { variants: [...] }, others just [...] — normalize:
  const arr = Array.isArray(result)
    ? result
    : Array.isArray((result as any).variants)
    ? (result as any).variants
    : [];
  return arr;
}

async function upsertVariants() {
  const existing = await getVariants(); // always an array now
  const method = existing.length ? "PATCH" : "POST";
  await cf("/images/v1/variants", {
    method,
    body: JSON.stringify({ variants: desired }),
  });
  console.log("✅ Variants ensured:", desired.map(v => v.id).join(", "));
}

upsertVariants().catch((err) => {
  console.error("❌ Failed to ensure variants:", err.message || err);
  process.exit(1);
});
