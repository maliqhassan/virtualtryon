import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateSavedLook } from '../services/saved-looks-api';
import type { SavedLook, UpdateSavedLookInput } from '../types';
import { SAVED_LOOKS_QUERY_KEY } from './use-saved-looks-query';

type UpdateVariables = { id: string; input: UpdateSavedLookInput };
type MutationContext = { previousLooks: SavedLook[] | undefined };

/**
 * Covers both rename and favourite-toggle — both are the same PATCH with
 * different optional fields, not two separate mutations. Optimistic update
 * matches the pattern docs/roadmap/phase-b-platform.md's Milestone 7 already
 * names for this exact interaction ("instant UI feedback, reconciled
 * against the server response").
 */
export function useUpdateSavedLook() {
  const queryClient = useQueryClient();

  return useMutation<SavedLook, unknown, UpdateVariables, MutationContext>({
    mutationFn: ({ id, input }) => updateSavedLook(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: SAVED_LOOKS_QUERY_KEY });
      const previousLooks = queryClient.getQueryData<SavedLook[]>(SAVED_LOOKS_QUERY_KEY);

      queryClient.setQueryData<SavedLook[]>(SAVED_LOOKS_QUERY_KEY, (looks) =>
        looks?.map((look) =>
          look.id === id
            ? {
                ...look,
                ...(input.title !== undefined && { title: input.title }),
                ...(input.isFavourite !== undefined && { isFavourite: input.isFavourite }),
              }
            : look,
        ),
      );

      return { previousLooks };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousLooks) {
        queryClient.setQueryData(SAVED_LOOKS_QUERY_KEY, context.previousLooks);
      }
    },
    onSuccess: (updatedLook) => {
      queryClient.setQueryData<SavedLook[]>(SAVED_LOOKS_QUERY_KEY, (looks) =>
        looks?.map((look) => (look.id === updatedLook.id ? updatedLook : look)),
      );
    },
  });
}
