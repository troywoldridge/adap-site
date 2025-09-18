// src/lib/r2.js
// Cloudflare R2 S3-compatible client (server-only). Used for uploads and server tasks.
// Public delivery to users should go through r2PublicUrl (CDN), not presigned S3 links.

import { S3Client } from "@aws-sdk/client-s3";

if (!process.env.R2_ACCOUNT_ID) throw new Error("R2_ACCOUNT_ID missing");
if (!process.env.R2_ACCESS_KEY_ID) throw new Error("R2_ACCESS_KEY_ID missing");
if (!process.env.R2_SECRET_ACCESS_KEY) throw new Error("R2_SECRET_ACCESS_KEY missing");
if (!process.env.R2_BUCKET && !process.env.R2_BUCKET_NAME) throw new Error("R2_BUCKET missing");

export const R2 = new S3Client({
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: "auto",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

export const R2_BUCKET = process.env.R2_BUCKET || process.env.R2_BUCKET_NAME;
export const R2_PUBLIC_BASEURL = (process.env.R2_PUBLIC_BASE_URL || process.env.R2_PUBLIC_BASEURL || "").replace(/\/+$/, "");
