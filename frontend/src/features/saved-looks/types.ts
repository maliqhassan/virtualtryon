export type SavedLook = {
  id: string;
  title: string;
  userImageUrl: string;
  clothingImageUrl: string;
  generatedImageUrl: string;
  isFavourite: boolean;
  /** Set when the look was saved from a try-on in this app. */
  inferenceJobId: string | null;
  createdAt: string;
};

export type UpdateSavedLookInput = {
  title?: string;
  isFavourite?: boolean;
};
