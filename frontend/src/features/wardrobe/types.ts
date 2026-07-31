export type Garment = {
  id: string;
  title: string;
  category: string;
  color: string | null;
  season: string | null;
  imageUrl: string;
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
  'Accessories',
  'Other',
] as const;

export type GarmentCategory = (typeof GARMENT_CATEGORIES)[number];
