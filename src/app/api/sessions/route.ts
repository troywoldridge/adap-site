import { NextResponse } from "next/server";

const BASE = {
  httpOnly: true as const, sameSite: "lax" as const, path: "/" as const,
  secure: process.env.NODE_ENV === "production",
};

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  // expire both cookie names
  res.cookies.set("adap_sid", "", { ...BASE, maxAge: 0 });
  res.cookies.set("sid", "", { ...BASE, maxAge: 0 });
  return res;
}
