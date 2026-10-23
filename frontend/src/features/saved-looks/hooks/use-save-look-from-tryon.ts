import { useMutation, useQueryClient } from '@tanstack/react-query';

import { saveLookFromTryOn } from '../services/saved-looks-api';
import { SAVED_LOOKS_QUERY_KEY } from './use-saved-looks-query';

export function useSaveLookFromTryOn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveLookFromTryOn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SAVED_LOOKS_QUERY_KEY }),
  });
}
