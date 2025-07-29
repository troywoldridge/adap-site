// src/hooks/useImages.ts

import useSWR from 'swr';
import type { Image } from '@/types/db';

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return res.json();
});

export function useImages(productId: number | undefined) {
  const { data, error, isValidating } = useSWR<Image[]>(
    productId ? `/api/images?productId=${productId}` : null,
    fetcher
  );

  return {
    images: data,
    isLoading: !error && !data,
    isError: error,
    isValidating,
  };
}
