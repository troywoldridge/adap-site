// src/lib/auth.ts
import { auth, currentUser } from "@clerk/nextjs/server";

/** Minimal, stable typing for Clerk's getToken */
type GetToken = (opts?: { template?: string }) => Promise<string | null>;

export type AuthContext = {
  userId: string;
  sessionId: string | null;
  getToken: GetToken;
};

/** Build a consistent 401/403 Response and throw it at call sites */
function makeHttpError(status: 401 | 403, message: string): Response {
  return new Response(message, { status });
}

export async function requireUser(): Promise<AuthContext> {
  const a = await auth();
  if (!a?.userId) {
    throw makeHttpError(401, "Unauthorized");
  }
  return {
    userId: a.userId,
    sessionId: a.sessionId ?? null,
    getToken: a.getToken as GetToken,
  };
}

/** Allowlist helper for quick bootstrap/admin access */
function isEmailAllowlisted(userEmails: string[] = []): boolean {
  const raw = process.env.ADMIN_EMAILS || "";
  const allow = raw
    .split(/[,\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!allow.length || !userEmails.length) {
    return false;
  }
  const set = new Set(allow);
  return userEmails.some((em: string) => set.has(em.toLowerCase()));
}

/**
 * Decide if current request's user is an admin.
 * Uses: publicMetadata.role === "admin" OR ADMIN_EMAILS allowlist.
 */
async function isAdminForCurrentRequest(expectedUserId: string): Promise<boolean> {
  const user = await currentUser();
  if (!user || user.id !== expectedUserId) {
    return false;
  }

  const role = (user.publicMetadata?.role as string | undefined)?.toLowerCase();
  if (role === "admin") {
    return true;
  }

  const emails = (user.emailAddresses ?? []).map((e) => e.emailAddress);
  if (isEmailAllowlisted(emails)) {
    return true;
  }

  // If you use Organizations and want org-admins to count, reintroduce clerkClient here.
  return false;
}

export async function requireAdmin(): Promise<AuthContext> {
  const ctx = await requireUser();
  if (process.env.ALLOW_ALL_ADMINS === "1") {
    return ctx;
  }

  const ok = await isAdminForCurrentRequest(ctx.userId);
  if (!ok) {
    throw makeHttpError(403, "Forbidden");
  }
  return ctx;
}

/** Convenience helpers */
export async function requireUserId(): Promise<string> {
  const { userId } = await requireUser();
  return userId;
}
export async function requireAdminId(): Promise<string> {
  const { userId } = await requireAdmin();
  return userId;
}
