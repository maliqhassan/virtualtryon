import type { Href } from 'expo-router';

export const SHOP_HREF = '/shop' as Href;
export function myStoreHref(host: string): Href {
  return { pathname: '/store/[host]', params: { host } } as Href;
}
export function productHref(productId: string): Href {
  return { pathname: '/product/[productId]', params: { productId } } as Href;
}
export const WISHLIST_HREF = '/wishlist' as Href;
/** The seasonal editorial lookbook (one for now). */
export const LOOKBOOK_HREF = '/lookbook/eid' as Href;
