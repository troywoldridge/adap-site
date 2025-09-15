// src/lib/sinalite.pricing-server.ts
import "server-only";
import { currencyToStoreCode } from "./sinaliteStore";
import { getSinaliteBearer } from "@/lib/sinalite.server";

const API_BASE = process.env.SINALITE_API_BASE ?? "https://api.sinaliteuppy.com";

export type EstimateItem = { productId: number; optionIds: number[] };
export type EstimateDest = { country: "US" | "CA"; state: string; zip: string };
export type ShippingRate = {
  carrier: string;
  serviceCode: string;
  serviceName: string;
  amount: number;
  currency: "USD" | "CAD";
  eta?: string | null;
  days?: number | null;
};

export async function estimateShippingServer(
  dest: EstimateDest,
  items: EstimateItem[],
): Promise<ShippingRate[]> {
  // ... your existing implementation that calls /order/shippingEstimate per SinaLite docs ...
}
