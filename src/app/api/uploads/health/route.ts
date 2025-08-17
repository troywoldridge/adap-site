export const runtime = "nodejs";
import { NextResponse } from "next/server";

function exists(name: string) { return Boolean(process.env[name]?.trim()); }

export async function GET() {
  const bucketName = (process.env.R2_BUCKET_NAME || process.env.R2_BUCKET)?.trim();
  return NextResponse.json({
    ok: Boolean(bucketName && process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_PUBLIC_BASE_URL),
    env: {
      R2_ACCOUNT_ID: exists("R2_ACCOUNT_ID"),
      R2_ACCESS_KEY_ID: exists("R2_ACCESS_KEY_ID"),
      R2_SECRET_ACCESS_KEY: exists("R2_SECRET_ACCESS_KEY"),
      R2_BUCKET_NAME: Boolean(bucketName),
      R2_PUBLIC_BASE_URL: exists("R2_PUBLIC_BASE_URL"),
      R2_UPLOAD_PREFIX: process.env.R2_UPLOAD_PREFIX ?? "(default: uploads)",
      R2_PRESIGN_EXPIRES_SECONDS: process.env.R2_PRESIGN_EXPIRES_SECONDS ?? "(default: 900)",
    },
    runtime: "nodejs",
  });
}
