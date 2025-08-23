// src/lib/getOrSetSid.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "node:crypto";

export const COOKIE_NAME = "adap_sid";

type CookieOpts = {
  /** If provided, we will set the cookie on this response (so the browser actually stores it). */
  res?: NextResponse;
  /** Force secure flag; defaults to true in production. */
  secure?: boolean;
};

function setSidOnResponse(res: NextResponse, sid: string, secure: boolean) {
  res.cookies.set(COOKIE_NAME, sid, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/**
 * Ensures you have a session id.
 * - Reads from request cookies (supports Next 14 sync and Next 15 async cookies()).
 * - If missing, generates one.
 * - If opts.res is provided, writes the cookie on that response.
 */
export async function getOrEnsureSid(opts: CookieOpts = {}): Promise<string> {
  const jarMaybe = cookies() as any;
  const jar = typeof jarMaybe?.then === "function" ? await jarMaybe : jarMaybe;

  let sid = jar?.get?.(COOKIE_NAME)?.value;
  if (!sid) {
    sid = crypto.randomUUID();
    if (opts.res) {
      setSidOnResponse(opts.res, sid, opts.secure ?? process.env.NODE_ENV === "production");
    }
    return sid;
  }

  // Optionally mirror onto response (idempotent) so it persists on the client
  if (opts.res) {
    setSidOnResponse(opts.res, sid, opts.secure ?? process.env.NODE_ENV === "production");
  }
  return sid;
}

// Back-compat so older imports keep compiling
export const getOrSetSid = getOrEnsureSid;
export type { CookieOpts };
