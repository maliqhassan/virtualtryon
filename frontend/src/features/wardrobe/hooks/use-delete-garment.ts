import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteGarment } from '../services/garments-api';
import type { Garment } from '../types';
import { GARMENTS_QUERY_KEY } from './use-garments-query';

export function useDeleteGarment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteGarment(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Garment[]>(GARMENTS_QUERY_KEY, (garments) =>
        garments?.filter((garment) => garment.id !== id),
      );
    },
  });
}
