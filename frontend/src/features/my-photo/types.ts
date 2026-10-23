/** Front is the photo every try-on uses; side and back are optional extra views. */
export type PhotoAngle = 'front' | 'side' | 'back';

export const PHOTO_ANGLES: { angle: PhotoAngle; label: string }[] = [
  { angle: 'front', label: 'Front' },
  { angle: 'side', label: 'Side' },
  { angle: 'back', label: 'Back' },
];

/** One of the user's own photos, uploaded once and reused. */
export type MyPhoto = {
  id: string;
  angle: PhotoAngle;
  imageUrl: string;
  /** The same photo on a plain background, when one could be made. */
  cutoutUrl: string | null;
  createdAt: string;
};

/** The best image to show for a photo: the plain-background cut-out if there is one. */
export function displayUrl(photo: MyPhoto): string {
  return photo.cutoutUrl ?? photo.imageUrl;
}
