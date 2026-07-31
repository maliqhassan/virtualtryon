import { apiClient } from '@/services/api/client';

import type { CreateProfileInput, Profile, UpdateProfileInput } from '../types';

const BASE_PATH = '/api/v1/profile';

/** Raw shape returned by the backend (backend/app/schemas/profile.py) —
 * snake_case, matching the Pydantic model exactly. Mapped to this app's
 * own camelCase Profile type at this boundary, same convention as
 * features/wardrobe/services/garments-api.ts.
 */
type ProfileDto = {
  id: string;
  display_name: string | null;
  age: number | null;
  gender: string | null;
  height_cm: number;
  weight_kg: number;
  body_type: string | null;
  preferred_fit: string | null;
  created_at: string;
  updated_at: string;
};

function toProfile(dto: ProfileDto): Profile {
  return {
    id: dto.id,
    displayName: dto.display_name,
    age: dto.age,
    gender: dto.gender,
    heightCm: dto.height_cm,
    weightKg: dto.weight_kg,
    bodyType: dto.body_type,
    preferredFit: dto.preferred_fit,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

function toDtoInput(input: CreateProfileInput | UpdateProfileInput): Record<string, unknown> {
  return {
    ...(input.displayName !== undefined && { display_name: input.displayName }),
    ...(input.age !== undefined && { age: input.age }),
    ...(input.gender !== undefined && { gender: input.gender }),
    ...(input.heightCm !== undefined && { height_cm: input.heightCm }),
    ...(input.weightKg !== undefined && { weight_kg: input.weightKg }),
    ...(input.bodyType !== undefined && { body_type: input.bodyType }),
    ...(input.preferredFit !== undefined && { preferred_fit: input.preferredFit }),
  };
}

/** GET returns `null` (not a 404) when the guest hasn't created a profile
 * yet — that's the backend's own contract, not an error to catch here. */
export async function getProfile(): Promise<Profile | null> {
  const response = await apiClient.get<ProfileDto | null>(BASE_PATH);
  return response.data ? toProfile(response.data) : null;
}

export async function createProfile(input: CreateProfileInput): Promise<Profile> {
  const response = await apiClient.post<ProfileDto>(BASE_PATH, toDtoInput(input));
  return toProfile(response.data);
}

export async function updateProfile(input: UpdateProfileInput): Promise<Profile> {
  const response = await apiClient.patch<ProfileDto>(BASE_PATH, toDtoInput(input));
  return toProfile(response.data);
}
