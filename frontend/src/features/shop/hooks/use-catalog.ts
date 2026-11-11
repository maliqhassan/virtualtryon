import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { getProduct, listCollection, listProducts, listStores } from '../services/catalog-api';
import type { Audience, Occasion } from '../types';

// The catalogue changes rarely; keep it fresh for 5 minutes.
const CATALOG_STALE_MS = 5 * 60_000;

export function useStoresQuery() {
  return useQuery({ queryKey: ['stores'], queryFn: listStores, staleTime: CATALOG_STALE_MS });
}

export function useProductsQuery(storeId: string | null, search = '') {
  return useQuery({
    queryKey: ['products', storeId ?? 'all', search],
    queryFn: () => listProducts(storeId, search),
    staleTime: CATALOG_STALE_MS,
    // Keep showing the previous results while a new search loads.
    placeholderData: keepPreviousData,
  });
}

/** `value`, but only after it has stopped changing for `delayMs`. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** The Try-On studio's Collections grid. */
export function useCollectionQuery(
  audience: Exclude<Audience, 'unisex'>,
  occasion: Occasion | null,
) {
  return useQuery({
    queryKey: ['collection', audience, occasion ?? 'all'],
    queryFn: () => listCollection(audience, occasion),
    staleTime: CATALOG_STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useProductQuery(productId: string | null | undefined) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProduct(productId as string),
    enabled: !!productId,
    staleTime: CATALOG_STALE_MS,
  });
}
