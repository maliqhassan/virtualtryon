import axios from 'axios';

import { apiClient } from '@/services/api/client';
import { uploadImage } from '@/services/api/upload-image';
import type { PickedImage } from '@/types';

import type { Garment, UpdateGarmentInput } from '../types';

const BASE_PATH = '/api/v1/garments';

/** Raw shape returned by the backend (backend/app/schemas/garment.py) —
 * snake_case, matching the Pydantic model exactly. Mapped to this app's
 * own camelCase Garment type at this boundary, same convention as
 * features/saved-looks/services/saved-looks-api.ts.
 */
type GarmentDto = {
  id: string;
  title: string;
  category: string;
  color: string | null;
  season: string | null;
  image_url: string;
  source_url: string | null;
  created_at: string;
  updated_at: string;
};

function toGarment(dto: GarmentDto): Garment {
  return {
    id: dto.id,
    title: dto.title,
    category: dto.category,
    color: dto.color,
    season: dto.season,
    imageUrl: dto.image_url,
    sourceUrl: dto.source_url,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

export async function listGarments(): Promise<Garment[]> {
  const response = await apiClient.get<GarmentDto[]>(BASE_PATH);
  return response.data.map(toGarment);
}

export type CreateGarmentInput = {
  image: PickedImage;
  title: string;
  category: string;
};

/**
 * Reuses the same generic uploadImage() helper the existing garment
 * (Phase 4) and saved-looks features already use — no second upload
 * mechanism. Unlike that older flow, this one doesn't fall back to a mock
 * on BackendUnavailableError: the endpoint is confirmed real, so a failed
 * request here is a genuine error, not "the backend doesn't exist yet."
 */
export async function createGarment(input: CreateGarmentInput): Promise<Garment> {
  const dto = await uploadImage<GarmentDto>({
    path: BASE_PATH,
    fieldName: 'image',
    image: input.image,
    fields: { title: input.title, category: input.category },
  });
  return toGarment(dto);
}

export async function updateGarment(id: string, input: UpdateGarmentInput): Promise<Garment> {
  const response = await apiClient.patch<GarmentDto>(`${BASE_PATH}/${id}`, input);
  return toGarment(response.data);
}

export async function deleteGarment(id: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/${id}`);
}

/** Why a pasted store link couldn't be imported. `code` comes from the
 * backend (backend/app/api/v1/endpoints/garments.py), except `limit_reached`
 * (HTTP 402: no try-ons left) and `network`. */
export type LinkImportErrorCode =
  | 'invalid_link'
  | 'not_a_product_page'
  | 'no_product_image'
  | 'blocked_link'
  | 'store_unreachable'
  | 'too_many_imports'
  | 'limit_reached'
  | 'network'
  | 'unknown';

const LINK_IMPORT_MESSAGES: Record<LinkImportErrorCode, string> = {
  invalid_link:
    'That doesn’t look like a product link. Copy the link from your browser’s address bar and paste it here.',
  not_a_product_page:
    'This looks like a page with many products. Open the one you want to try, then copy that link.',
  no_product_image:
    'We couldn’t find a product photo on this page. Try another link, or save a screenshot of the item and add it in Wardrobe.',
  blocked_link: 'We can’t open this link. Try a link from a store’s website.',
  store_unreachable:
    'This store didn’t let us in. Save a screenshot of the item and add it in Wardrobe instead.',
  too_many_imports: 'You’ve added a lot of store links today. Please try again tomorrow.',
  limit_reached: 'You’ve used all your try-ons.',
  network: 'Can’t reach the server. Check your connection and try again.',
  unknown: 'Something went wrong with this link. Please try again.',
};

export class LinkImportError extends Error {
  constructor(readonly code: LinkImportErrorCode) {
    super(LINK_IMPORT_MESSAGES[code]);
    this.name = 'LinkImportError';
  }
}

function linkImportErrorCode(error: unknown): LinkImportErrorCode {
  // eslint-disable-next-line import/no-named-as-default-member -- axios.isAxiosError is the documented API; the rule false-positives on axios's dual export shape.
  if (!axios.isAxiosError(error)) return 'unknown';
  if (!error.response) return 'network';
  if (error.response.status === 402) return 'limit_reached';
  const code: unknown = error.response.data?.detail?.code;
  if (typeof code === 'string' && code in LINK_IMPORT_MESSAGES) return code as LinkImportErrorCode;
  return error.response.status === 422 ? 'invalid_link' : 'unknown';
}

/** The server opens the link, finds the product and its photo, and saves it
 * as a private wardrobe item that remembers the link. */
export async function importGarmentFromLink(url: string): Promise<Garment> {
  try {
    const response = await apiClient.post<GarmentDto>(`${BASE_PATH}/from-link`, { url });
    return toGarment(response.data);
  } catch (error) {
    throw new LinkImportError(linkImportErrorCode(error));
  }
}
