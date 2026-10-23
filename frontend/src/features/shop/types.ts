/** Mirrors backend/app/schemas/catalog.py. */
export type Store = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  accentColor: string;
  productCount: number;
};

export type Product = {
  id: string;
  storeId: string;
  storeName: string;
  title: string;
  category: string;
  priceCents: number;
  currency: string;
  imageUrl: string;
  /** Where to buy it on the store's own site; null for sample products. */
  productUrl: string | null;
};
