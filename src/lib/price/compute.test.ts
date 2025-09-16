import { describe, it, expect, vi, beforeEach } from "vitest";

// 👇 Mock only the SinaLite price call; keep resolveStoreCode real
vi.mock("@/lib/sinalite.server", async () => {
  const actual = await vi.importActual<any>("@/lib/sinalite.server");
  return {
    ...actual,
    priceByOptionIds: vi.fn(), // we control returns in each test
  };
});

import { computePrice } from "@/lib/price/compute";
import { priceByOptionIds } from "@/lib/sinalite.server";

describe("computePrice()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("computes USD totals from unit cost (line-level markup, qty=25)", async () => {
    // Mock SinaLite unit cost (cents)
    (priceByOptionIds as unknown as vi.Mock).mockResolvedValue({
      unitPriceCents: 200, // $2.00 each trade cost
      optionsByGroup: {},
    });

    const result = await computePrice({
      productId: 111,
      store: "US",
      quantity: 25,
      optionIds: [1, 2, 3],
    });

    // cost
    expect(result.unitCostCents).toBe(200);
    expect(result.lineCostCents).toBe(200 * 25); // 5000

    // markup: 1.50x on the LINE (from vitest.setup.ts)
    // raw line sell = 5000 * 1.50 = 7500
    // unit sell = round(7500 / 25) = round(300) = 300
    // final line = 300 * 25 = 7500
    expect(result.currency).toBe("USD");
    expect(result.unitSellCents).toBe(300);
    expect(result.lineSellCents).toBe(7500);
  });

  it("computes CAD totals and rounds unit to keep unit*qty == subtotal", async () => {
    (priceByOptionIds as unknown as vi.Mock).mockResolvedValue({
      unitPriceCents: 99, // $0.99 each trade cost
      optionsByGroup: {},
    });

    const result = await computePrice({
      productId: 222,
      store: "CA",
      quantity: 100,
      optionIds: [7, 8],
    });

    // cost
    expect(result.unitCostCents).toBe(99);
    expect(result.lineCostCents).toBe(9900);

    // markup: 1.50x line = 14850; unit = round(14850/100)=149; line = 149*100=14900
    expect(result.currency).toBe("CAD");
    expect(result.unitSellCents).toBe(149);
    expect(result.lineSellCents).toBe(14900);
  });

  it("passes optionIds through to SinaLite and uses store code mapping implicitly", async () => {
    (priceByOptionIds as unknown as vi.Mock).mockResolvedValue({
      unitPriceCents: 500,
      optionsByGroup: {},
    });

    const optionIds = [10, 20, 30];

    await computePrice({
      productId: 333,
      store: "US",
      quantity: 10,
      optionIds,
    });

    // We can't see storeCode here (resolveStoreCode runs inside compute),
    // but we can ensure we invoked the correct upstream fn with our optionIds.
    expect(priceByOptionIds).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 333,
        optionIds, // exact array passed through
        // storeCode mapping (9 for US / 6 for CA) is exercised implicitly
      }),
    );
  });
});
