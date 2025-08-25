export type Store = "US" | "CA";
export type Currency = "USD" | "CAD";

export function storeToCurrency(s: Store | string): Currency {
  return String(s).toUpperCase() === "CA" ? "CAD" : "USD";
}
export function currencyToStoreCode(c: Currency): "en_us" | "en_ca" {
  return c === "CAD" ? "en_ca" : "en_us";
}
