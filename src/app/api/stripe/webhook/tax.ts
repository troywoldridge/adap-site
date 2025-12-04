// src/app/api/stripe/webhook/tax.ts
export type TaxLocation = { country?: string | null; state?: string | null; zip?: string | null } | null;

const US_STATE_TAX_RATES: Record<string, number> = {
  CA: 0.0725,
  NY: 0.04,
  TX: 0.0625,
  WA: 0.065,
  FL: 0.06,
  IL: 0.0625,
};

const CA_PROVINCE_TAX_RATES: Record<string, number> = {
  ON: 0.13,
  QC: 0.14975,
  BC: 0.12,
  AB: 0.05,
  MB: 0.12,
};

function normalizeCode(code?: string | null): string {
  return (code || "").trim().toUpperCase();
}

function resolveTaxRate(location: TaxLocation): number {
  const country = normalizeCode(location?.country);
  const state = normalizeCode(location?.state);

  if (country === "US") return US_STATE_TAX_RATES[state] ?? 0;
  if (country === "CA" || country === "CANADA") return CA_PROVINCE_TAX_RATES[state] ?? 0;

  return 0; // no nexus / unsupported region
}

export function calculateTaxCents(args: {
  subtotalCents: number;
  shippingCents: number;
  creditsCents?: number;
  location?: TaxLocation;
  stripeTotalCents?: number | null;
}) {
  const creditsCents = Math.max(0, Number(args.creditsCents ?? 0));
  const taxableCents = Math.max(0, Number(args.subtotalCents ?? 0) + Number(args.shippingCents ?? 0));
  const rate = resolveTaxRate(args.location ?? null);
  const baseTaxCents = Math.round(taxableCents * rate);

  // Stripe is source of truth for what was charged; reconcile if provided
  const stripeTotalCents =
    typeof args.stripeTotalCents === "number" && Number.isFinite(args.stripeTotalCents)
      ? Math.max(0, Math.round(args.stripeTotalCents))
      : null;

  const reconciledTaxCents =
    stripeTotalCents === null
      ? baseTaxCents
      : Math.max(0, stripeTotalCents - (taxableCents - creditsCents));

  return {
    taxCents: reconciledTaxCents,
    taxRate: rate,
    reconciledWithStripe: stripeTotalCents !== null,
  };
}
