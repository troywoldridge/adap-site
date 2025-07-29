// src/hooks/useSubcategories.ts

import useSWR from 'swr';
import type { Subcategory } from '@/types/db';

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return res.json();
});

export function useSubcategories(categoryId: string | undefined) {
  const { data, error, isValidating } = useSWR<Subcategory[]>(
    categoryId ? `/api/subcategories?categoryId=${categoryId}` : null,
    fetcher
  );

  return {
    subcategories: data,
    isLoading: !error && !data,
    isError: error,
    isValidating,
  };
}
