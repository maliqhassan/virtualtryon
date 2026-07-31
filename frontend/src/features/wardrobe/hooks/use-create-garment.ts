import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createGarment } from '../services/garments-api';
import type { Garment } from '../types';
import { GARMENTS_QUERY_KEY } from './use-garments-query';

export function useCreateGarment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createGarment,
    onSuccess: (garment) => {
      queryClient.setQueryData<Garment[]>(GARMENTS_QUERY_KEY, (garments) =>
        garments ? [garment, ...garments] : [garment],
      );
    },
  });
}
