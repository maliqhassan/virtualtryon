import { useQuery } from '@tanstack/react-query';

import { getUsage } from '../services/usage-api';

export const USAGE_QUERY_KEY = ['usage'] as const;

export function useUsageQuery() {
  return useQuery({ queryKey: USAGE_QUERY_KEY, queryFn: getUsage, staleTime: 15_000 });
}
