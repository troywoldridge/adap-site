// src/lib/sinalite/products.ts

import { getSinaliteToken } from './auth';

export interface SinaliteProduct {
  id: number;
  sku: string;
  name: string;
  category: string;
  enabled: number;
}

function buildBaseUrl(): string | null {
  const base = process.env.SINALITE_API_BASE;
  if (!base) return null;
  return base.replace(/\/+$/, ''); // strip trailing slash
}

async function safeFetch(url: string, options: RequestInit = {}) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(
        `⚠️ Fetch to ${url} failed: ${res.status} ${res.statusText} ${text}`
      );
      return null;
    }
    return res;
  } catch (err) {
    console.warn(`⚠️ Network error fetching ${url}:`, err);
    return null;
  }
}

export async function listProducts(): Promise<SinaliteProduct[]> {
  const base = buildBaseUrl();
  if (!base) {
    console.warn(
      '⚠️ SINALITE_API_BASE not set; listProducts returning empty array.'
    );
    return [];
  }

  const token = await getSinaliteToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = token;
  }

  const url = `${base}/product`;

  const response = await safeFetch(url, { headers });

  if (!response) {
    return [];
  }

  try {
    return (await response.json()) as SinaliteProduct[];
  } catch (err) {
    console.warn('⚠️ Failed to parse listProducts JSON:', err);
    return [];
  }
}

export async function getProductDetails(
  id: number,
  storeCode: 'en_us' | 'en_ca' = 'en_us'
): Promise<{
  options: Record<string, unknown>;
  pricingData: Record<string, unknown>;
  metadata: Record<string, unknown>;
} | null> {
  const base = buildBaseUrl();
  if (!base) {
    console.warn(
      '⚠️ SINALITE_API_BASE not set; getProductDetails returning null.'
    );
    return null;
  }

  const token = await getSinaliteToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = token;
  }

  const url = `${base}/product/${id}/${storeCode}`;

  const response = await safeFetch(url, { headers });

  if (!response) {
    return null;
  }

  try {
    const json = await response.json();
    return {
      options: json.options ?? {},
      pricingData: json.pricingData ?? {},
      metadata: json.metadata ?? {},
    };
  } catch (err) {
    console.warn('⚠️ Failed to parse getProductDetails JSON:', err);
    return null;
  }
}
