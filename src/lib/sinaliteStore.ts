// src/lib/sinaliteStore.ts
/**
 * Store helpers for SinaLite.
 * - Supports BOTH textual codes ("en_us" | "en_ca") and numeric codes (9 | 6).
 * - Normalizes a variety of env inputs (US/CA, en_us/en_ca, USD/CAD).
 *
 * 🔗 SinaLite API note:
 *   Some endpoints/SDKs expect locale strings ("en_us"/"en_ca"),
 *   while others in your app may still use numeric store codes (US=9, CA=6).
 *   Use getSinaStoreCode() for locale strings, getSinaStoreNumeric() for 9/6.
 */

export type Store = "US" | "CA";
export type Currency = "USD" | "CAD";
export type StoreCode = "en_us" | "en_ca";       // textual (locale) code
export type StoreNumeric = 9 | 6;                 // numeric code: US=9, CA=6

/* ---------------------------- Env resolution ---------------------------- */

function readFirst(keys: string[]): string | null {
  for (const k of keys) {
    const v = (process.env as Record<string, string | undefined>)[k];
    if (v && v.trim()) return v.trim();
  }
  return null;
}

/**
 * We accept many env aliases so you can set whichever is convenient:
 * - Region-ish: NEXT_PUBLIC_STORE, STORE, NEXT_PUBLIC_SINALITE_STORE, SINALITE_STORE, NEXT_PUBLIC_COUNTRY, COUNTRY
 * - Currency:   NEXT_PUBLIC_CURRENCY, CURRENCY
 */
const RAW_STORE = readFirst([
  "NEXT_PUBLIC_STORE",
  "STORE",
  "NEXT_PUBLIC_SINALITE_STORE",
  "SINALITE_STORE",
  "NEXT_PUBLIC_COUNTRY",
  "COUNTRY",
]);

const RAW_CURRENCY = readFirst(["NEXT_PUBLIC_CURRENCY", "CURRENCY"]);

/* ------------------------------ Normalizers ----------------------------- */

/** Normalize to "USD" | "CAD" from any store/currency-like input. */
export function storeToCurrency(s: Store | string): Currency {
  const v = String(s).trim().toUpperCase().replace(/[^A-Z_]/g, "");
  if (v === "CA" || v === "CAD" || v === "EN_CA" || v === "CANADA") return "CAD";
  return "USD";
}

/** Normalize currency string to locale store code "en_us" | "en_ca". */
export function currencyToStoreCode(c: Currency): StoreCode {
  return c === "CAD" ? "en_ca" : "en_us";
}

/** Normalize arbitrary input to "US" | "CA". */
export function normalizeStore(s?: string | null): Store {
  const cur = s ? storeToCurrency(s) : "USD";
  return cur === "CAD" ? "CA" : "US";
}

/** Convert "US" | "CA" (or any string) directly to "en_us" | "en_ca". */
export function storeToStoreCode(s: Store | string): StoreCode {
  return currencyToStoreCode(storeToCurrency(s));
}

/** Convert "US" | "CA" (or any string) to numeric 9 (US) | 6 (CA). */
export function storeToNumeric(s: Store | string): StoreNumeric {
  const cur = storeToCurrency(s);
  return cur === "CAD" ? 6 : 9;
}

/* ----------------------------- Defaults & getters ----------------------------- */

/** Default store from env (falls back to US). */
export const DEFAULT_STORE: Store = normalizeStore(RAW_STORE ?? RAW_CURRENCY ?? "US");

/** Default currency from env (falls back to USD). */
export const DEFAULT_CURRENCY: Currency = storeToCurrency(RAW_CURRENCY ?? RAW_STORE ?? DEFAULT_STORE);

/** Default textual store code ("en_us" | "en_ca"). */
export const DEFAULT_STORE_CODE: StoreCode = currencyToStoreCode(DEFAULT_CURRENCY);

/** Default numeric store (9 for US, 6 for CA). */
export const DEFAULT_STORE_NUMERIC: StoreNumeric = storeToNumeric(DEFAULT_STORE);

/** Get the textual store code for current environment: "en_us" | "en_ca". */
export function getSinaStoreCode(s?: string | null): StoreCode {
  // precedence: explicit param → env → default
  if (s && s.trim()) return storeToStoreCode(s);
  if (RAW_STORE) return storeToStoreCode(RAW_STORE);
  if (RAW_CURRENCY) return currencyToStoreCode(storeToCurrency(RAW_CURRENCY));
  return DEFAULT_STORE_CODE;
}

/** Get the numeric store code for current environment: 9 (US) | 6 (CA). */
export function getSinaStoreNumeric(s?: string | null): StoreNumeric {
  if (s && s.trim()) return storeToNumeric(s);
  if (RAW_STORE) return storeToNumeric(RAW_STORE);
  if (RAW_CURRENCY) return storeToNumeric(RAW_CURRENCY);
  return DEFAULT_STORE_NUMERIC;
}

/** Convenience flags */
export function isCanada(input?: string | null): boolean {
  return storeToCurrency(input ?? RAW_STORE ?? RAW_CURRENCY ?? DEFAULT_STORE) === "CAD";
}
export function isUnitedStates(input?: string | null): boolean {
  return !isCanada(input);
}

/* --------------------------------- Examples ---------------------------------

// Textual code for endpoints expecting locale strings (recommended if API uses locales):
const localeCode = getSinaStoreCode(); // "en_us" | "en_ca"

// Numeric code for your existing routes that use 9/6 (US/CA):
const numericCode = getSinaStoreNumeric(); // 9 | 6

// Explicit override (e.g., user picked "CA" in UI):
const chosenLocale = getSinaStoreCode("CA");     // "en_ca"
const chosenNumeric = getSinaStoreNumeric("CA"); // 6

----------------------------------------------------------------------------- */
