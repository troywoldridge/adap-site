// src/hooks/useProducts.ts

import useSWR from 'swr';
import type { Product } from '@/types/db';

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return res.json();
});

export function useProducts(subcategoryId: number | undefined) {
  const { data, error, isValidating } = useSWR<Product[]>(
    subcategoryId ? `/api/products?subcategoryId=${subcategoryId}` : null,
    fetcher
  );

  return {
    products: data,
    isLoading: !error && !data,
    isError: error,
    isValidating,
  };
}
