export type Garment = {
  id: string;
  title: string;
  category: string;
  color: string | null;
  season: string | null;
  imageUrl: string;
  /** The store product page it was added from ("paste a link"); null for uploads. */
  sourceUrl: string | null;
  /** That store's own name, e.g. "Outfitters"; null for uploads and older imports. */
  sourceStore: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateGarmentInput = {
  title?: string;
  category?: string;
};

/** Fixed list, per the design brief — not an enum on the backend (no
 * authoritative taxonomy exists there yet), but a fixed picker here since
 * that's exactly what was asked for on the frontend. */
export const GARMENT_CATEGORIES = [
  'Shirts',
  'T-Shirts',
  'Hoodies',
  'Jackets',
  'Pants',
  'Shorts',
  'Dresses',
  'Shoes',
  'Bags',
  'Accessories',
  'Other',
] as const;

export type GarmentCategory = (typeof GARMENT_CATEGORIES)[number];
