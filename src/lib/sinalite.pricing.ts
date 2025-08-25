/* server-only */
import { getSinaliteAccessToken } from "@/lib/getSinaliteAccessToken";
import { optionIdsToSinaOptions } from "@/lib/sinaliteOptionMap";
import { currencyToStoreCode, storeToCurrency, type Store, type Currency } from "@/lib/storeCodes";

const BASE = process.env.SINALITE_BASE_URL ?? "https://liveapi.sinalite.com";

type PriceResult = {
  unitPrice: number; // dollars
  pricingMeta: { productOptions?: Record<string, string>; packageInfo?: unknown; raw?: unknown };
};

export async function priceSinaliteProduct(args: {
  productId: number;
  optionIds: number[];
  store: Store; // "US" | "CA"
}): Promise<PriceResult> {
  const { productId, optionIds, store } = args;
  const currency: Currency = storeToCurrency(store);
  const storeCode = currencyToStoreCode(currency);
  const token = await getSinaliteAccessToken();

  // build productOptions map from ids (may return null)
  const mapped = await optionIdsToSinaOptions(productId, optionIds);
  const options: Record<string, string> = mapped?.options ?? {};

  // make sure we actually have a full options object
  if (!options || Object.keys(options).length === 0) {
    throw new Error(
      "Could not map optionIds to SinaLite option groups. Make one selection per group (including Qty)."
    );
  }

  // (IMPORTANT) make sure qty is present – SinaLite expects one option per group
  if (!("qty" in options)) {
    throw new Error("Missing required 'qty' option for pricing.");
  }

  const url = `${BASE}/price/${productId}/${storeCode}`;
  const payload = { productOptions: options };

  const r = await fetch(url, {
    method: "POST",
    headers: {
      authorization: token, // "Bearer <token>"
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const text = await r.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON; handled below */
  }

  if (!r.ok) {
    throw new Error(`SinaLite price failed ${r.status}: ${text?.slice(0, 400)}`);
  }

  // docs show price as number-like string; fallbacks just in case
  const priceNum = Number(json?.price ?? json?.response?.price ?? json?.price2?.price ?? 0);
  const unitPrice = Number.isFinite(priceNum) ? priceNum : 0;

  return {
    unitPrice,
    pricingMeta: {
      productOptions: json?.productOptions ?? json?.response?.productOptions ?? options,
      packageInfo: json?.packageInfo ?? json?.response?.packageInfo ?? null,
      raw: json,
    },
  };
}
