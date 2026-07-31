import { useQuery } from '@tanstack/react-query';

import { listGarments } from '../services/garments-api';

export const GARMENTS_QUERY_KEY = ['garments'];

export function useGarmentsQuery() {
  return useQuery({
    queryKey: GARMENTS_QUERY_KEY,
    queryFn: listGarments,
  });
}
