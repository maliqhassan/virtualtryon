import { useMutation } from '@tanstack/react-query';

import { saveToPhotos, type SaveToPhotosResult } from '../services/save-to-photos';

/** Saves a result image to the phone's photo library ("denied" if access was refused). */
export function useSaveToPhotos() {
  return useMutation<SaveToPhotosResult, Error, string>({ mutationFn: saveToPhotos });
}
