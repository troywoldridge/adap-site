/* server-only */
import { getSinaliteAccessToken } from "@/lib/getSinaliteAccessToken";
import { optionIdsToSinaOptions } from "@/lib/sinaliteOptionMap";
import {
  currencyToStoreCode,
  storeToCurrency,
  type Store,
  type Currency,
} from "@/lib/storeCodes";
import {
  getSinaliteProductArrays,
  normalizeOptionGroups,
} from "@/lib/sinalite.client";

const BASE = process.env.SINALITE_BASE_URL ?? "https://liveapi.sinalite.com";

type PriceResult = {
  unitPrice: number; // dollars
  pricingMeta: {
    productOptions?: Record<string, string>;
    packageInfo?: unknown;
    raw?: unknown;
  };
};

function isQtyKey(k: string) {
  const s = k.toLowerCase().replace(/\s+/g, "");
  return s === "qty" || s === "quantity";
}

export async function priceSinaliteProduct(args: {
  productId: number;
  optionIds: number[];
  store: Store; // "US" | "CA"
}): Promise<PriceResult> {
  const { productId, optionIds, store } = args;
  const currency: Currency = storeToCurrency(store);
  const storeCode = currencyToStoreCode(currency);
  const token = await getSinaliteAccessToken();

  // 1) Map IDs -> { options: { groupKey: "valueId" } }
  const mapped = await optionIdsToSinaOptions(productId, optionIds);
  const options: Record<string, string> = mapped?.options ?? {};

  // 2) Ensure we have a Qty selection; if missing, try to auto-fill from product defs
  let hasQty = Object.keys(options).some(isQtyKey);

  if (!hasQty) {
    // Pull product options, find the Qty group, and choose a sensible default (first value)
    try {
      const { optionsArray } = await getSinaliteProductArrays(String(productId));
      const groups = normalizeOptionGroups(optionsArray || []);

      // find a group that canonicalizes to Qty
      const qtyGroup: any =
        (groups as any[]).find((g) => isQtyKey(String(g?.name ?? g?.label ?? g?.group ?? g?.title ?? ""))) ||
        null;

      if (qtyGroup) {
        const values: any[] =
          qtyGroup.options || qtyGroup.values || qtyGroup.items || qtyGroup.choices || [];
        const first = values[0];
        const firstId = Number(first?.id ?? first?.valueId ?? first?.optionId ?? first?.value ?? first?.code);
        if (Number.isFinite(firstId) && firstId > 0) {
          const key = String(qtyGroup?.name ?? qtyGroup?.label ?? "qty");
          options[key] = String(firstId);
          hasQty = true;
        }
      }
    } catch {
      // ignore; we’ll error below if still missing
    }
  }

  if (!hasQty) {
    throw new Error("Missing required 'qty' option for pricing.");
  }

  // 3) Call SinaLite price API
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
    /* non-JSON */
  }

  if (!r.ok) {
    throw new Error(`SinaLite price failed ${r.status}: ${text?.slice(0, 400)}`);
  }

  const priceNum = Number(
    json?.price ?? json?.response?.price ?? json?.price2?.price ?? 0
  );
  const unitPrice = Number.isFinite(priceNum) ? priceNum : 0;

  return {
    unitPrice,
    pricingMeta: {
      productOptions:
        (json?.productOptions ??
          json?.response?.productOptions ??
          options) || undefined,
      packageInfo: json?.packageInfo ?? json?.response?.packageInfo ?? null,
      raw: json,
    },
  };
}
