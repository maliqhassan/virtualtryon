import { create } from 'zustand';

import type { ImageValidationErrorCode, PickedImage } from '@/types';

export type PreparedImageResult = {
  id: string;
  status: 'ready';
  receivedAt: string;
};

export type ImageSessionState = {
  selectedImage: PickedImage | null;
  validationError: ImageValidationErrorCode | null;
  /** The mock/real "prepare" call's result — survives navigation away from
   * the upload screen, unlike the mutation state that produced it. This is
   * what lets a later screen (AI processing) know a photo/garment is
   * actually ready, not just picked. */
  preparedResult: PreparedImageResult | null;
  setSelectedImage: (image: PickedImage, validationError: ImageValidationErrorCode | null) => void;
  clearSelectedImage: () => void;
  setPreparedResult: (result: PreparedImageResult | null) => void;
};

/**
 * Every feature that manages one in-progress picked image (user-photo,
 * garment, ...) needs an identically-shaped store — but a SEPARATE instance
 * per feature, not one shared store. A user photo and a garment photo need
 * to coexist once a try-on request (docs/roadmap Milestone 4) references
 * both at once; a single shared "current image" slot would make that
 * impossible. This factory removes the duplicated store *logic* while each
 * caller still gets its own independent instance.
 */
export function createImageSessionStore() {
  return create<ImageSessionState>((set) => ({
    selectedImage: null,
    validationError: null,
    preparedResult: null,
    // Picking a new image always invalidates whatever was prepared for the
    // previous one — a stale prepared result must never be mistaken for
    // the currently-selected image's result.
    setSelectedImage: (image, validationError) =>
      set({ selectedImage: image, validationError, preparedResult: null }),
    clearSelectedImage: () =>
      set({ selectedImage: null, validationError: null, preparedResult: null }),
    setPreparedResult: (result) => set({ preparedResult: result }),
  }));
}
