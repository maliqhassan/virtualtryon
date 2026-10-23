import { apiClient } from '@/services/api/client';

import type { Product, Store } from '../types';

type StoreDto = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  accent_color: string;
  product_count: number;
};

type ProductDto = {
  id: string;
  store_id: string;
  store_name: string;
  title: string;
  category: string;
  price_cents: number;
  currency: string;
  image_url: string;
  product_url: string | null;
};

function toStore(dto: StoreDto): Store {
  return {
    id: dto.id,
    slug: dto.slug,
    name: dto.name,
    tagline: dto.tagline,
    accentColor: dto.accent_color,
    productCount: dto.product_count,
  };
}

function toProduct(dto: ProductDto): Product {
  return {
    id: dto.id,
    storeId: dto.store_id,
    storeName: dto.store_name,
    title: dto.title,
    category: dto.category,
    priceCents: dto.price_cents,
    currency: dto.currency,
    imageUrl: dto.image_url,
    productUrl: dto.product_url,
  };
}

export async function listStores(): Promise<Store[]> {
  const response = await apiClient.get<StoreDto[]>('/api/v1/stores');
  return response.data.map(toStore);
}

/** All stores when `storeId` is null. `search` matches title, category or store name. */
export async function listProducts(storeId: string | null, search = ''): Promise<Product[]> {
  const path = storeId ? `/api/v1/stores/${storeId}/products` : '/api/v1/products';
  const response = await apiClient.get<ProductDto[]>(path, {
    params: search ? { q: search } : undefined,
  });
  return response.data.map(toProduct);
}

export async function getProduct(productId: string): Promise<Product> {
  const response = await apiClient.get<ProductDto>(`/api/v1/products/${productId}`);
  return toProduct(response.data);
}
