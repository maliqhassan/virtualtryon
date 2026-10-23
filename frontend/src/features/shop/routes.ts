import type { Href } from 'expo-router';

export const SHOP_HREF = '/shop' as Href;
export function productHref(productId: string): Href {
  return { pathname: '/product/[productId]', params: { productId } } as Href;
}
