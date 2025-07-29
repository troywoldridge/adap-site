// src/hooks/useCategories.ts

import useSWR from 'swr';
import type { Category } from '@/types/db';

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return res.json();
});

export function useCategories() {
  const { data, error, isValidating } = useSWR<Category[]>('/api/categories', fetcher);

  return {
    categories: data,
    isLoading: !error && !data,
    isError: error,
    isValidating,
  };
}
