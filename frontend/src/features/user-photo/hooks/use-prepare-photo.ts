import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import type { PickedImage } from '@/types';

import { preparePhoto } from '../services/prepare-photo';
import { useUploadSessionStore } from '../store/upload-session';
import type { PreparePhotoResponse } from '../types';

export function usePreparePhoto() {
  const [progress, setProgress] = useState(0);
  const setPreparedResult = useUploadSessionStore((s) => s.setPreparedResult);

  const mutation = useMutation<PreparePhotoResponse, Error, PickedImage>({
    retry: false, // retry policy lives inside preparePhoto/uploadImage, which knows which errors are worth retrying
    mutationFn: (image) => {
      setProgress(0);
      return preparePhoto(image, setProgress);
    },
    // Persisted to the store (not just left in this mutation's own state) so
    // it survives navigation away from this screen — the AI processing
    // screen needs to know this photo is ready without this hook still
    // being mounted.
    onSuccess: (data) => {
      setPreparedResult({ id: data.photoId, status: data.status, receivedAt: data.receivedAt });
    },
  });

  return { ...mutation, progress };
}
