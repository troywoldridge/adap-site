// src/app/admin/images/page.tsx
import ClientSearch from './ClientSearch';

export default async function ImageAdminPage() {
  // 1️⃣ Fetch directly from Cloudflare Images
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
  const apiToken  = process.env.CLOUDFLARE_API_TOKEN!;
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1?per_page=1000`,
    {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    throw new Error(`Cloudflare Images list failed: ${res.status}`);
  }

  const json = await res.json();
  const images: {
    id: string;
    filename: string;
    variants: { [key: string]: string };
  }[] = json.result;

  return <ClientSearch images={images} />;
}
