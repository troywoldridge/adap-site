// src/lib/loyalty.ts
export const POINTS_EARN_PER_USD = 2;    // earn 2 pts per $1 spent
export const REDEMPTION_RATE = 100;      // 100 pts = $1.00 off (1¢/pt)
export function pointsEarned(subtotal: number) {
  return Math.floor(subtotal * POINTS_EARN_PER_USD);
}
export function dollarsForPoints(points: number) {
  return points / REDEMPTION_RATE;
}
