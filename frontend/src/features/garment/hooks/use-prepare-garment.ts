import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import type { PickedImage } from '@/types';

import { prepareGarment } from '../services/prepare-garment';
import { useGarmentSessionStore } from '../store/garment-session';
import type { PrepareGarmentResponse } from '../types';

export function usePrepareGarment() {
  const [progress, setProgress] = useState(0);
  const setPreparedResult = useGarmentSessionStore((s) => s.setPreparedResult);

  const mutation = useMutation<PrepareGarmentResponse, Error, PickedImage>({
    retry: false, // retry policy lives inside prepareGarment/uploadImage, which knows which errors are worth retrying
    mutationFn: (image) => {
      setProgress(0);
      return prepareGarment(image, setProgress);
    },
    // Persisted to the store (not just left in this mutation's own state) so
    // it survives navigation away from this screen — the AI processing
    // screen needs to know this garment is ready without this hook still
    // being mounted.
    onSuccess: (data) => {
      setPreparedResult({ id: data.garmentId, status: data.status, receivedAt: data.receivedAt });
    },
  });

  return { ...mutation, progress };
}
