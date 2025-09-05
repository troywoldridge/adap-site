// src/lib/authSession.ts
import "server-only";
import { auth } from "@clerk/nextjs/server";

export async function getUserIdSafe(): Promise<string | null> {
  try {
    const { userId } = await auth(); // server-safe in App Router
    return userId ?? null;
  } catch {
    // Any Clerk hiccup should NOT explode your page or start query-param loops
    return null;
  }
}
