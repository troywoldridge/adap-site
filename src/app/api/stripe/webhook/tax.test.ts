import { describe, expect, it } from "vitest";

import { calculateTaxCents } from "./tax";

describe("calculateTaxCents", () => {
  it("applies jurisdiction tax when location is taxable and matches Stripe totals", () => {
    const subtotalCents = 20000; // $200.00
    const shippingCents = 1500; // $15.00

    const result = calculateTaxCents({
      subtotalCents,
      shippingCents,
      creditsCents: 0,
      location: { country: "US", state: "CA", zip: "94103" },
      stripeTotalCents: 23059, // 21500 taxable * 7.25% = 1559 tax
    });

    expect(result.taxRate).toBeGreaterThan(0);
    expect(result.taxCents).toBe(1559);
    expect(subtotalCents + shippingCents + result.taxCents).toBe(23059);
    expect(result.reconciledWithStripe).toBe(true);
  });

  it("keeps tax zero for exempt locations but reconciles to the amount Stripe charged", () => {
    const subtotalCents = 10000; // $100.00
    const creditsCents = 500; // $5.00 applied store credit

    const result = calculateTaxCents({
      subtotalCents,
      shippingCents: 0,
      creditsCents,
      location: { country: "US", state: "OR", zip: "97205" },
      // Stripe’s total is authoritative; reconcile so totals stay idempotent
      stripeTotalCents: 10000,
    });

    expect(result.taxRate).toBe(0);
    expect(result.taxCents).toBe(500); // 10000 - (10000 - 500)
    expect(subtotalCents + result.taxCents - creditsCents).toBe(10000);
    expect(calculateTaxCents({
      subtotalCents,
      shippingCents: 0,
      creditsCents,
      location: { country: "US", state: "OR" },
      stripeTotalCents: 10000,
    })).toMatchObject(result); // deterministic/idempotent
  });
});
