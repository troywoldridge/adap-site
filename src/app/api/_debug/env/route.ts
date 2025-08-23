import { NextResponse } from "next/server";

export async function GET() {
  const pick = (k: string) => process.env[k] ?? "(unset)";
  const mask = (v: string) =>
    v.length > 8 ? v.slice(0, 4) + "…" + v.slice(-4) : v;

  return NextResponse.json({
    SINALITE_API_BASE: pick("SINALITE_API_BASE"),
    SINALITE_STORE_ID: pick("SINALITE_STORE_ID"),
    STRIPE_API_VERSION: pick("STRIPE_API_VERSION"),
    NEXT_PUBLIC_BASE_URL: pick("NEXT_PUBLIC_BASE_URL"),
    // masked secrets
    SINALITE_CLIENT_ID: mask(pick("SINALITE_CLIENT_ID")),
    SINALITE_CLIENT_SECRET: mask(pick("SINALITE_CLIENT_SECRET")),
  });
}
