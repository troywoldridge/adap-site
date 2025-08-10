// lib/authz.ts
import { auth, currentUser } from "@clerk/nextjs/server";

export async function requireUser() {
  const { userId } = await auth(); // ✅ await
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const user = await currentUser();
  return user!; // you can add a null check if you want to be extra safe
}

export async function requireAdmin() {
  const user = await requireUser();
  const role = (user.publicMetadata?.role as string) || "user";
  if (role !== "admin") {
    throw new Error("Forbidden");
  }
  return user;
}
