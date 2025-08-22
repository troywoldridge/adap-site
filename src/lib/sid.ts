import { cookies as cookiesAsync } from "next/headers";
import crypto from "node:crypto";

export const SID_COOKIE = "sid";

/** Always await in route handlers (Next 14.2+). */
export async function getSid(): Promise<string | null> {
  const jar = await cookiesAsync();
  return jar.get(SID_COOKIE)?.value ?? null;
}

export async function getOrSetSid(): Promise<string> {
  const jar = await cookiesAsync();
  let sid = jar.get(SID_COOKIE)?.value ?? null;
  if (!sid) {
    sid = crypto.randomUUID();
    jar.set(SID_COOKIE, sid, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return sid;
}
