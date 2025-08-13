// src/lib/r2.js
import { S3Client } from "@aws-sdk/client-s3";

if (!process.env.R2_ACCOUNT_ID) throw new Error("R2_ACCOUNT_ID missing");
if (!process.env.R2_ACCESS_KEY_ID) throw new Error("R2_ACCESS_KEY_ID missing");
if (!process.env.R2_SECRET_ACCESS_KEY) throw new Error("R2_SECRET_ACCESS_KEY missing");
if (!process.env.R2_BUCKET_NAME) throw new Error("R2_BUCKET_NAME missing");

export const R2 = new S3Client({
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: "auto",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME;
export const R2_PUBLIC_BASEURL = process.env.R2_PUBLIC_BASEURL;
