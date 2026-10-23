import { useMutation, useQueryClient } from '@tanstack/react-query';

import { USAGE_QUERY_KEY } from '@/features/usage';

import { createTryOnJob } from '../services/tryon-job';
import type { CreateTryOnJobInput, TryOnJob } from '../types';

export function useStartTryOn() {
  const queryClient = useQueryClient();
  return useMutation<TryOnJob, Error, CreateTryOnJobInput>({
    mutationFn: createTryOnJob,
    // Starting (or being refused) changes the remaining count either way.
    onSettled: () => queryClient.invalidateQueries({ queryKey: USAGE_QUERY_KEY }),
  });
}
