// lib/sinaliteStore.ts
export type StoreCode = "en_us" | "en_ca";
export type Currency = "USD" | "CAD";
export type Store = "US" | "CA";

export function currencyToStoreCode(c: Currency): StoreCode {
  return c === "CAD" ? "en_ca" : "en_us";
}
export function storeToCurrency(s: Store | string): Currency {
  const v = String(s).toUpperCase();
  return v === "CA" || v === "CAD" ? "CAD" : "USD";
}
export function normalizeStore(s?: string | null): Store {
  return storeToCurrency(s ?? "US") === "CAD" ? "CA" : "US";
}
