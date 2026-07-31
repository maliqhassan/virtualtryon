import { useQuery } from '@tanstack/react-query';

import { listSavedLooks } from '../services/saved-looks-api';

export const SAVED_LOOKS_QUERY_KEY = ['saved-looks'];

export function useSavedLooksQuery() {
  return useQuery({
    queryKey: SAVED_LOOKS_QUERY_KEY,
    queryFn: listSavedLooks,
  });
}
