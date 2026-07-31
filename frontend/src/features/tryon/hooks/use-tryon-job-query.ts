import { useQuery } from '@tanstack/react-query';

import { getTryOnJob } from '../services/tryon-job';
import type { TryOnJob } from '../types';

const TERMINAL_STATUSES: TryOnJob['status'][] = ['completed', 'failed'];

/**
 * Reads (and, while not yet terminal, polls) a try-on job by id. Extracted
 * from useTryOnJob so both real consumers — the processing screen (via
 * useTryOnJob, which composes this) and the results screen (which only
 * ever reads, never creates) — share one query definition instead of two
 * near-identical ones.
 */
export function useTryOnJobQuery(jobId: string | null) {
  return useQuery<TryOnJob>({
    queryKey: ['tryon-job', jobId],
    queryFn: () => {
      if (!jobId) throw new Error('No active try-on job.');
      return getTryOnJob(jobId);
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && TERMINAL_STATUSES.includes(status) ? false : 600;
    },
  });
}
