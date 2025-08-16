import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { carts, cartLines, cartAttachments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import CartShippingEstimator from "@/components/CartShippingEstimator";
import { cfUrl } from "@/lib/data";

const SID_COOKIE = "adap_sid";

async function loadCart() {
  const sid = cookies().get(SID_COOKIE)?.value || "";
  const cart = await db.query.carts.findFirst({ where: and(eq(carts.sid, sid), eq(carts.status, "open")) });
  if (!cart) return { lines: [] as any[] };

  const lines = await db.query.cartLines.findMany({ where: eq(cartLines.cartId, cart.id) });
  const lineIds = lines.map((l) => l.id);

  const attachments = lineIds.length
    ? await db.query.cartAttachments.findMany({
        where: (fields, { inArray }) => inArray(fields.lineId, lineIds.map(String)),
      })
    : [];

  const enriched = lines.map((l) => ({
    ...l,
    attachments: attachments.filter((a) => a.lineId === String(l.id)),
  }));

  return { lines: enriched };
}

export default async function ReviewCartPage() {
  const { lines } = await loadCart();

  const estimateLines = lines.map((l) => ({
    productId: l.productId,
    optionIds: Array.isArray(l.optionIds) ? (l.optionIds as number[]) : [],
    quantity: l.quantity,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-semibold">Review Your Order</h1>

      <div className="space-y-4">
        {lines.length === 0 && <div className="text-sm text-gray-600">Your cart is empty.</div>}

        {lines.map((l) => (
          <div key={l.id} className="rounded border p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Product #{l.productId}</div>
              <div className="text-sm text-gray-500">Qty: {l.quantity}</div>
            </div>

            {l.attachments?.length ? (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {l.attachments.map((a: any) => {
                  const url = cfUrl(a.storageId) || "";
                  return (
                    <div key={a.id} className="border rounded overflow-hidden">
                      {url ? (
                        // Cloudflare Images delivery
                        <img src={url} alt={a.fileName} className="block w-full h-24 object-cover" />
                      ) : (
                        <div className="h-24 flex items-center justify-center text-xs text-gray-400">
                          No preview
                        </div>
                      )}
                      <div className="px-2 py-1 text-xs truncate">{a.fileName}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-3 text-xs text-gray-500">No artwork attached yet.</div>
            )}
          </div>
        ))}
      </div>

      {estimateLines.length > 0 && (
        <div className="mt-8">
          <CartShippingEstimator
            lines={estimateLines}
            defaultCountry="US"
            defaultState="KY"
            defaultZip="41179"
          />
        </div>
      )}
    </div>
  );
}
