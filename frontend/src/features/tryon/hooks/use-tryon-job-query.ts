import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { getTryOnJob } from '../services/tryon-job';
import type { TryOnJob } from '../types';

const TERMINAL_STATUSES: TryOnJob['status'][] = ['completed', 'failed'];
const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 10_000;

/**
 * Reads (and, while not yet terminal, polls) a try-on job by id. Extracted
 * from useTryOnJob so both real consumers — the processing screen (via
 * useTryOnJob, which composes this) and the results screen (which only
 * ever reads, never creates) — share one query definition instead of two
 * near-identical ones.
 *
 * Polling is bounded, not infinite: once per second for up to 10 seconds
 * from when this hook first starts watching a given job id. With no
 * inference worker wired up yet (Sprint 4 Stage 1), a real job never
 * leaves `queued` on its own, so unbounded polling would hit the backend
 * forever for no reason. `pollingTimedOut` flips to true once that window
 * elapses without reaching a terminal status — the screen decides what to
 * show; this hook only decides when to stop asking automatically.
 * `refetch` is exposed so a screen can still manually ask again after that
 * point (a real request, not a fake status change).
 */
export function useTryOnJobQuery(jobId: string | null) {
  const watchStartedAtRef = useRef<number | null>(null);
  const [pollingTimedOut, setPollingTimedOut] = useState(false);

  useEffect(() => {
    watchStartedAtRef.current = jobId ? Date.now() : null;
    setPollingTimedOut(false);
  }, [jobId]);

  const query = useQuery<TryOnJob>({
    queryKey: ['tryon-job', jobId],
    queryFn: () => {
      if (!jobId) throw new Error('No active try-on job.');
      return getTryOnJob(jobId);
    },
    enabled: !!jobId,
    refetchInterval: (currentQuery) => {
      const status = currentQuery.state.data?.status;
      if (status && TERMINAL_STATUSES.includes(status)) return false;
      const startedAt = watchStartedAtRef.current;
      if (!startedAt || Date.now() - startedAt >= POLL_TIMEOUT_MS) return false;
      return POLL_INTERVAL_MS;
    },
  });

  const status = query.data?.status;

  useEffect(() => {
    const startedAt = watchStartedAtRef.current;
    if (!jobId || !startedAt) return;
    if (status && TERMINAL_STATUSES.includes(status)) return;

    const remaining = POLL_TIMEOUT_MS - (Date.now() - startedAt);
    if (remaining <= 0) {
      setPollingTimedOut(true);
      return;
    }
    const timer = setTimeout(() => setPollingTimedOut(true), remaining);
    return () => clearTimeout(timer);
  }, [jobId, status]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    pollingTimedOut,
  };
}
