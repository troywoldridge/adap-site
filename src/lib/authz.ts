// lib/authz.ts
import { auth, currentUser } from "@clerk/nextjs/server";

export async function requireUser() {
  const { userId } = auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const user = await currentUser();
  return user!;
}

export async function requireAdmin() {
  const user = await requireUser();
  const role = (user.publicMetadata?.role as string) || "user";
  if (role !== "admin") {
    throw new Error("Forbidden");
  }
  return user;
}
