// src/lib/pii.ts
import { sql } from "drizzle-orm";

const PII_KEY = process.env.PII_KEY!;
if (!PII_KEY) {
  throw new Error("Missing PII_KEY");
}

export const enc = (plain: string | null | undefined) =>
  plain ? sql`pgp_sym_encrypt(${plain}, ${PII_KEY})` : null;

export const dec = (col: any) => sql<string>`pgp_sym_decrypt(${col}, ${PII_KEY})`;
