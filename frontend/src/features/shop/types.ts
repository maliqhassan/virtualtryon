/** Mirrors backend/app/schemas/catalog.py. */
export type Audience = 'men' | 'women' | 'unisex';
export type Occasion = 'casual' | 'dresses' | 'office' | 'wedding';

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
  /** Who it's for; unisex pieces show for both in the Try-On studio. */
  audience: Audience;
  occasions: Occasion[];
  /** How well it suits the user. Not sent by the server yet (see ../flags.ts). */
  match?: ProductMatch;
};

export type ProductMatch = {
  score: number;
  label: 'perfect' | 'good' | 'poor';
  /** Letter grades, e.g. "A", "B+". */
  colour: string;
  fit: string;
  reason: string;
};
