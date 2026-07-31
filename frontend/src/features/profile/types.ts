export type Profile = {
  id: string;
  displayName: string | null;
  age: number | null;
  gender: string | null;
  heightCm: number;
  weightKg: number;
  bodyType: string | null;
  preferredFit: string | null;
  createdAt: string;
  updatedAt: string;
};

/** height_cm/weight_kg are required at creation (backend's own rule —
 * see backend/app/schemas/profile.py's CreateProfileRequest); every other
 * field is optional. */
export type CreateProfileInput = {
  heightCm: number;
  weightKg: number;
  displayName?: string;
  age?: number;
  gender?: string;
  bodyType?: string;
  preferredFit?: string;
};

export type UpdateProfileInput = Partial<CreateProfileInput>;
