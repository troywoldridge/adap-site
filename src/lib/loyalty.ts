// src/lib/loyalty.ts
// Centralized loyalty math + config.
// Keep accrual/redemption rules aligned with the SinaLite API documentation
// (i.e., grant points only after an order reaches a final billable state).

export type LoyaltyTier = "Bronze" | "Silver" | "Gold" | "Platinum";

export const LOYALTY = {
  // EARN: points per 1 unit of currency (USD/CAD). Tweak as you like.
  EARN_POINTS_PER_DOLLAR: {
    USD: 10,
    CAD: 10,
  },
  // REDEEM: points required for $1 store credit (100 pts = $1.00)
  REDEEM_POINTS_PER_DOLLAR: 100,
  // Min redemption in points and increment step (multiples of 100 recommended)
  REDEEM_MIN_POINTS: 100,
  REDEEM_INCREMENT: 100,
};

const TIERS: { name: LoyaltyTier; min: number; next?: number }[] = [
  { name: "Bronze",   min: 0,     next: 1000 },
  { name: "Silver",   min: 1000,  next: 5000 },
  { name: "Gold",     min: 5000,  next: 20000 },
  { name: "Platinum", min: 20000 },
];

export interface LoyaltySnapshot {
  balance: number;
  points: number; // alias for UI
  tier: LoyaltyTier;
  nextTierAt: number | null;
}

export function computeLoyalty(pointsBalance: number): LoyaltySnapshot {
  const tier = [...TIERS].reverse().find(t => pointsBalance >= t.min) ?? TIERS[0];
  const nextTierAt = tier.next == null ? null : Math.max(0, tier.next - pointsBalance);
  return { balance: pointsBalance, points: pointsBalance, tier: tier.name, nextTierAt };
}

export function pointsToCreditDollars(points: number): number {
  return points / LOYALTY.REDEEM_POINTS_PER_DOLLAR;
}

export function creditDollarsToPoints(credit: number): number {
  return Math.round(credit * LOYALTY.REDEEM_POINTS_PER_DOLLAR);
}
