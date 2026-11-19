import { useMutation, useQueryClient } from '@tanstack/react-query';

import { MY_PHOTO_QUERY_KEY, useInUsePhotoId } from '@/features/my-photo';
import { USAGE_QUERY_KEY } from '@/features/usage';

import { MissingPhotoError, PhotoGoneError, createTryOnJob } from '../services/tryon-job';
import type { CreateTryOnJobInput, TryOnJob } from '../types';

/** Starts a try-on with the model photo the user has in use (their pick,
 * else the newest), wherever it's started from. */
export function useStartTryOn() {
  const queryClient = useQueryClient();
  const photoId = useInUsePhotoId();
  return useMutation<TryOnJob, Error, CreateTryOnJobInput>({
    mutationFn: (input) => createTryOnJob({ ...input, userPhotoId: photoId }),
    // Starting (or being refused) changes the remaining count either way.
    onSettled: () => queryClient.invalidateQueries({ queryKey: USAGE_QUERY_KEY }),
    // The photo may have been deleted on another phone: refresh the list, so
    // the next attempt falls back to one that's there.
    onError: (error) => {
      if (error instanceof PhotoGoneError || error instanceof MissingPhotoError) {
        void queryClient.invalidateQueries({ queryKey: MY_PHOTO_QUERY_KEY });
      }
    },
  });
}
