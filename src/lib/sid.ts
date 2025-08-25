// src/lib/sid.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const SID_COOKIE_NAMES = ["adap_sid", "sid"] as const;

const COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

// Next 14/15 compatible cookie jar getter
async function getJar() {
  const maybe = cookies() as any;
  return typeof maybe?.then === "function" ? await maybe : maybe;
}

export async function readSidFromCookies(): Promise<string | undefined> {
  const jar = await getJar();
  const a = (jar?.get?.("adap_sid")?.value ?? undefined) as string | undefined;
  const b = (jar?.get?.("sid")?.value ?? undefined) as string | undefined;
  return a && a.length > 0 ? a : b && b.length > 0 ? b : undefined;
}

export function setSidCookies(res: NextResponse, sid: string) {
  res.cookies.set("adap_sid", sid, COOKIE_OPTS);
  res.cookies.set("sid", sid, COOKIE_OPTS);
}

function mintSid(): string {
  try {
    // Node >= 19 / Edge / modern runtimes
    // @ts-ignore
    if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  } catch {}
  // Fallback
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Get the existing SID from cookies or mint a new one.
 * If you pass a NextResponse, it will set both cookie names (adap_sid + sid).
 */
export async function getOrEnsureSid(opts?: { res?: NextResponse }): Promise<string> {
  const existing = await readSidFromCookies();
  const sid = existing ?? mintSid();
  if (opts?.res) setSidCookies(opts.res, sid);
  return sid;
}

/**
 * Back-compat alias for older imports.
 * Example usage in routes:
 *   let res = NextResponse.json({ ok: true });
 *   const sid = await getOrSetSid({ res });
 */
export async function getOrSetSid(opts?: { res?: NextResponse }): Promise<string> {
  return getOrEnsureSid(opts);
}
