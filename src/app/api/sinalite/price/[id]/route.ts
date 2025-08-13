import { NextResponse } from "next/server";
import {
  getSinalitePriceRegular,
  getSinaliteProductArrays,
} from "@/lib/sinalite.client";

/**
 * POST /api/sinalite/price/:id
 *
 * Accepts either:
 *   { productOptions: number[], storeCode?: "en_us"|"en_ca" }
 * or
 *   { selectionsByName: Record<string,string>, storeCode?: "en_us"|"en_ca" }
 *
 * - Resolves names → IDs from the product options array.
 * - If some groups are not provided, auto-picks the FIRST value from the API
 *   so you always get a price (good for testing/UX).
 */
export async function POST(req: Request, ctx: { params: { id?: string } }) {
  try {
    const body = await req.json().catch(() => ({} as any));

    // Be extra defensive about product id
    const productId: string =
      (ctx?.params?.id ?? body?.productId ?? "").toString().trim();
    if (!productId) {
      return NextResponse.json(
        { error: true, message: "Missing product id in URL (/price/:id)." },
        { status: 400 }
      );
    }

    const store = body.storeCode || process.env.NEXT_PUBLIC_STORE_CODE || "en_us";
    let optionIds: number[] | null = null;

    // Case 1: caller sent raw option IDs
    if (Array.isArray(body.productOptions) && body.productOptions.length > 0) {
      optionIds = body.productOptions
        .map((n: any) => Number(n))
        .filter((n: number) => Number.isFinite(n));
    }

    // Case 2: caller sent names → resolve to IDs and auto-fill the rest
    if (!optionIds && body?.selectionsByName && typeof body.selectionsByName === "object") {
      const { optionsArray } = await getSinaliteProductArrays(productId, store);

      // Build map: groupKey -> [{id, name}]
      const groups = new Map<string, { id: number; name: string }[]>();
      const norm = (s: string) => s.toLowerCase().replace(/[_\s-]+/g, " ").trim();

      for (const row of optionsArray || []) {
        if (row && typeof row === "object" && "group" in row && "id" in row && "name" in row) {
          const gKey = norm(String(row.group));
          if (!groups.has(gKey)) groups.set(gKey, []);
          groups.get(gKey)!.push({ id: Number(row.id), name: String(row.name) });
          continue;
        }
        // (Roll-label products are posted as name/value pairs to a different price shape.
        //  This route targets regular products.)
      }

      const chosen = new Map<string, number>();

      // First, resolve what the client provided
      for (const [rawGroup, rawValue] of Object.entries(
        body.selectionsByName as Record<string, string>
      )) {
        const gKey = norm(String(rawGroup));
        const vKey = norm(String(rawValue));
        const list = groups.get(gKey);

        if (!list || list.length === 0) {
          // Provide a helpful message listing known groups
          const known = Array.from(groups.keys()).join(", ");
          return NextResponse.json(
            {
              error: true,
              message: `Unknown option group "${rawGroup}" for product ${productId}. Known groups: ${known || "(none)"}`,
            },
            { status: 400 }
          );
        }

        const match =
          list.find((v) => norm(v.name) === vKey) ||
          list.find((v) => norm(v.name).includes(vKey)); // loose match fallback

        if (!match) {
          const vals = list.map((v) => v.name).slice(0, 25).join(" | ");
          return NextResponse.json(
            {
              error: true,
              message: `No value matching "${rawValue}" in group "${rawGroup}". Some available: ${vals}...`,
            },
            { status: 400 }
          );
        }
        chosen.set(gKey, match.id);
      }

      // Then, auto-fill any groups that weren’t provided with the FIRST available option
      for (const [gKey, list] of groups.entries()) {
        if (!chosen.has(gKey) && list.length > 0) {
          chosen.set(gKey, list[0].id);
        }
      }

      optionIds = Array.from(new Set(chosen.values()));
    }

    if (!optionIds || optionIds.length === 0) {
      return NextResponse.json(
        {
          error: true,
          message:
            "productOptions must be a non-empty number[] (or send selectionsByName: { group: value } to auto-map).",
        },
        { status: 400 }
      );
    }

    const priceJson = await getSinalitePriceRegular(productId, optionIds, store);
    return NextResponse.json(priceJson, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: true, message: err?.message || "Pricing failed" },
      { status: 500 }
    );
  }
}
