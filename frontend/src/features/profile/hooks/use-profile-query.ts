import { useQuery } from '@tanstack/react-query';

import { getProfile } from '../services/profile-api';

export const PROFILE_QUERY_KEY = ['profile'];

export function useProfileQuery() {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: getProfile,
  });
}
