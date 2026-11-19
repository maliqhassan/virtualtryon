/** One of the user's model photos: a photo of themselves to try clothes on. */
export type MyPhoto = {
  id: string;
  imageUrl: string;
  /** The same photo on a plain background, when one could be made. */
  cutoutUrl: string | null;
  createdAt: string;
};

/** The most photos one user can keep (backend MAX_PHOTOS_PER_USER). */
export const MAX_MODEL_PHOTOS = 10;

/** The best image to show for a photo: the plain-background cut-out if there is one. */
export function displayUrl(photo: MyPhoto): string {
  return photo.cutoutUrl ?? photo.imageUrl;
}
