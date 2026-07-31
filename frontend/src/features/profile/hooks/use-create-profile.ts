import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createProfile } from '../services/profile-api';
import { PROFILE_QUERY_KEY } from './use-profile-query';

export function useCreateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, profile);
    },
  });
}
