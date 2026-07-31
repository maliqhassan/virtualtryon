import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateGarment } from '../services/garments-api';
import type { Garment, UpdateGarmentInput } from '../types';
import { GARMENTS_QUERY_KEY } from './use-garments-query';

type UpdateVariables = { id: string; input: UpdateGarmentInput };
type MutationContext = { previousGarments: Garment[] | undefined };

/** Covers both rename and change-category — same PATCH, different fields.
 * Optimistic update, same pattern as use-update-saved-look.ts. */
export function useUpdateGarment() {
  const queryClient = useQueryClient();

  return useMutation<Garment, unknown, UpdateVariables, MutationContext>({
    mutationFn: ({ id, input }) => updateGarment(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: GARMENTS_QUERY_KEY });
      const previousGarments = queryClient.getQueryData<Garment[]>(GARMENTS_QUERY_KEY);

      queryClient.setQueryData<Garment[]>(GARMENTS_QUERY_KEY, (garments) =>
        garments?.map((garment) =>
          garment.id === id
            ? {
                ...garment,
                ...(input.title !== undefined && { title: input.title }),
                ...(input.category !== undefined && { category: input.category }),
              }
            : garment,
        ),
      );

      return { previousGarments };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousGarments) {
        queryClient.setQueryData(GARMENTS_QUERY_KEY, context.previousGarments);
      }
    },
    onSuccess: (updatedGarment) => {
      queryClient.setQueryData<Garment[]>(GARMENTS_QUERY_KEY, (garments) =>
        garments?.map((garment) => (garment.id === updatedGarment.id ? updatedGarment : garment)),
      );
    },
  });
}
