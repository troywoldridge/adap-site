// src/app/api/me/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { auth, currentUser, clerkClient as rawClerkClient } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Normalize clerkClient across Clerk versions (v4/v5) */
async function getClerk() {
  const anyClient: any = rawClerkClient as any;
  // In some versions clerkClient is a function that returns the real client
  return typeof anyClient === "function" ? await anyClient() : anyClient;
}

type Me = {
  firstName?: string;
  lastName?: string;
  email: string;
  avatarCfId?: string | null;
  company?: string;
};

function toMe(user: any): Me {
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    "";

  return {
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email,
    company: (user?.publicMetadata?.company as string | undefined) ?? "",
    avatarCfId: (user?.publicMetadata?.avatarCfId as string | undefined) ?? null,
  };
}

/** GET /api/me — return current user profile */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fast path
    const meUser = await currentUser();
    if (meUser) return NextResponse.json(toMe(meUser), { headers: { "Cache-Control": "no-store" } });

    // Fallback via clerkClient
    const cc = await getClerk();
    const user = await cc.users.getUser(userId);
    return NextResponse.json(toMe(user), { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    console.error("/api/me GET failed:", e);
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

/** PUT /api/me — update first/last/company and optional avatarCfId */
export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({} as any));

    const update: any = {};
    if (typeof body.firstName === "string") update.firstName = body.firstName;
    if (typeof body.lastName === "string") update.lastName = body.lastName;

    const publicMetadata: Record<string, any> = {};
    if (typeof body.company === "string") publicMetadata.company = body.company;
    if (typeof body.avatarCfId === "string") publicMetadata.avatarCfId = body.avatarCfId;
    if (Object.keys(publicMetadata).length) update.publicMetadata = publicMetadata;

    const cc = await getClerk();
    await cc.users.updateUser(userId, update);

    const refreshed = await cc.users.getUser(userId);
    return NextResponse.json(toMe(refreshed));
  } catch (e: any) {
    console.error("/api/me PUT failed:", e);
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
