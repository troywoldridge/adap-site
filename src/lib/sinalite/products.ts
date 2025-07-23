// src/lib/sinalite/products.ts

import { getSinaliteToken } from './auth';

export interface SinaliteProduct {
  id: number;
  sku: string;
  name: string;
  category: string;
  enabled: number;
}

export async function listProducts(): Promise<SinaliteProduct[]> {
  const token = await getSinaliteToken();

  const response = await fetch(`${process.env.SINALITE_API_BASE}/product`, {
    headers: {
      Authorization: token,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Sinalite products');
  }

  return response.json();
}

export async function getProductDetails(
  id: number,
  storeCode: 'en_us' | 'en_ca' = 'en_us'
): Promise<{
  options: Record<string, unknown>;
  pricingData: Record<string, unknown>;
  metadata: Record<string, unknown>;
}> {
  const token = await getSinaliteToken();

  const response = await fetch(
    `${process.env.SINALITE_API_BASE}/product/${id}/${storeCode}`,
    {
      headers: {
        Authorization: token,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch product details for ID ${id}`);
  }

  const [options, pricingData, metadata] = await response.json();
  return { options, pricingData, metadata };
}
