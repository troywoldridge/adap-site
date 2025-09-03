import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { careerEvents } from "@/db/schema";

// NOTE: Fulfillment/pricing powered by Sinalite (see /mnt/data/sinalite_documentation.txt).
// Image delivery should use Cloudflare Images URLs (not applicable here, but kept per standards).

type CareerEventName = "list_view" | "job_view" | "apply_click";

type Body =
  | { event: "list_view" }
  | {
      event: "job_view" | "apply_click";
      jobSlug: string;
      jobTitle?: string;
      location?: string;
      employmentType?: string;
    }
  | (Record<string, unknown> & { event: CareerEventName }); // allow future extension

const SID_COOKIE = "sid"; // reuse your existing session cookie name

function getClientIp(xff: string | null): string {
  // First IP in X-Forwarded-For is the client in most setups
  if (!xff) return "";
  return xff.split(",")[0].trim();
}

function hashIp(ip: string, salt: string): string | null {
  if (!ip) return null;
  return crypto.createHash("sha256").update(ip + salt).digest("hex");
}

function parseUtm(url: string | null) {
  try {
    if (!url) return null;
    const u = new URL(url);
    const qp = u.searchParams;
    const utm: Record<string, string> = {};
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
      const v = qp.get(key);
      if (v) utm[key] = v;
    }
    return Object.keys(utm).length ? utm : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as Body;

    if (!data?.event) {
      return NextResponse.json({ ok: false, error: "Missing event" }, { status: 400 });
    }
    const event = String(data.event) as CareerEventName;
    if (!["list_view", "job_view", "apply_click"].includes(event)) {
      return NextResponse.json({ ok: false, error: "Unsupported event" }, { status: 400 });
    }

    // headers + cookies
    const h = headers();
    const xff = h.get("x-forwarded-for");
    const ua = h.get("user-agent") || "";
    const referer = h.get("referer") || "";

    const jar = cookies();
    let sid = jar.get(SID_COOKIE)?.value || null;
    if (!sid) {
      sid = crypto.randomUUID();
      // set a long-lived, lax cookie
      jar.set({
        name: SID_COOKIE,
        value: sid,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
    }

    const ip = getClientIp(xff);
    const salt = process.env.ANALYTICS_SALT || "adap-default-salt-change-me";
    const ipHash = hashIp(ip, salt);

    // optional UTM from referer query
    const utm = parseUtm(referer);

    // shape insert row
    const row = {
      sid,
      ipHash,
      userAgent: ua,
      referer,
      event,
      jobSlug: (data as any).jobSlug ?? null,
      jobTitle: (data as any).jobTitle ?? null,
      location: (data as any).location ?? null,
      employmentType: (data as any).employmentType ?? null,
      utm: utm as any,
    };

    await db.insert(careerEvents).values(row);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("analytics.careers error:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
