import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type LinkImportError, importGarmentFromLink } from '../services/garments-api';
import type { Garment } from '../types';
import { GARMENTS_QUERY_KEY } from './use-garments-query';

/** Imports a pasted store product link as a wardrobe item. */
export function useImportFromLink() {
  const queryClient = useQueryClient();

  return useMutation<Garment, LinkImportError, string>({
    mutationFn: importGarmentFromLink,
    onSuccess: (garment) => {
      queryClient.setQueryData<Garment[]>(GARMENTS_QUERY_KEY, (garments) =>
        garments ? [garment, ...garments] : [garment],
      );
    },
  });
}
