// src/lib/sid.ts
import { cookies } from "next/headers";

export function getOrSetSid() {
  const jar = cookies();
  let sid = jar.get("sid")?.value;
  if (!sid) {
    sid = crypto.randomUUID();
    jar.set("sid", sid, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return sid;
}
