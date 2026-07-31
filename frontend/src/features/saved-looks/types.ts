export type SavedLook = {
  id: string;
  title: string;
  userImageUrl: string;
  clothingImageUrl: string;
  generatedImageUrl: string;
  isFavourite: boolean;
  createdAt: string;
};

export type UpdateSavedLookInput = {
  title?: string;
  isFavourite?: boolean;
};
