import { auth, clerkClient } from "@clerk/nextjs/server";

type EmailAddressLike = { emailAddress: string };

/**
 * Simple admin gate:
 * 1) Clerk publicMetadata.role === "admin"
 * 2) OR user email is in env ADMIN_EMAILS (comma/space/semicolon separated)
 */
export async function requireAdmin(): Promise<{ userId: string }> {
  const { userId } = await auth();
  if (!userId) throw Object.assign(new Error("Unauthorized"), { status: 401 });

  // ✅ clerkClient is a function in your env — call and await it
  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  // Safely read role from publicMetadata
  const roleRaw = (user.publicMetadata as Record<string, unknown> | undefined)?.role;
  const role = typeof roleRaw === "string" ? roleRaw.toLowerCase() : undefined;
  const isAdminByRole = role === "admin";

  // ✅ Explicitly type strings to avoid implicit any
  const ADMIN_EMAILS: string[] = (process.env.ADMIN_EMAILS ?? "")
    .split(/[,\s;]+/g)
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);

  const userEmails: string[] = (user.emailAddresses ?? []).map(
    (x: EmailAddressLike) => x.emailAddress.toLowerCase()
  );

  const isAdminByEmail = userEmails.some((e: string) => ADMIN_EMAILS.includes(e));

  if (!isAdminByRole && !isAdminByEmail) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  return { userId };
}
