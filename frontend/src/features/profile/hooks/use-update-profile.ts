import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateProfile } from '../services/profile-api';
import type { Profile, UpdateProfileInput } from '../types';
import { PROFILE_QUERY_KEY } from './use-profile-query';

type MutationContext = { previousProfile: Profile | null | undefined };

/** Optimistic update, same pattern as use-update-garment.ts — the cache
 * here holds a single Profile (or null) rather than a list, so the
 * optimistic merge is a plain object spread instead of a list `.map()`. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation<Profile, unknown, UpdateProfileInput, MutationContext>({
    mutationFn: updateProfile,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: PROFILE_QUERY_KEY });
      const previousProfile = queryClient.getQueryData<Profile | null>(PROFILE_QUERY_KEY);

      if (previousProfile) {
        queryClient.setQueryData<Profile>(PROFILE_QUERY_KEY, { ...previousProfile, ...input });
      }

      return { previousProfile };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousProfile !== undefined) {
        queryClient.setQueryData(PROFILE_QUERY_KEY, context.previousProfile);
      }
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, updatedProfile);
    },
  });
}
