import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteSavedLook } from '../services/saved-looks-api';
import type { SavedLook } from '../types';
import { SAVED_LOOKS_QUERY_KEY } from './use-saved-looks-query';

export function useDeleteSavedLook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSavedLook(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<SavedLook[]>(SAVED_LOOKS_QUERY_KEY, (looks) =>
        looks?.filter((look) => look.id !== id),
      );
    },
  });
}
