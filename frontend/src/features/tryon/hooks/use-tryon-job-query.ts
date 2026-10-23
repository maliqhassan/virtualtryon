import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { getTryOnJob } from '../services/tryon-job';
import type { TryOnJob } from '../types';

const TERMINAL_STATUSES: TryOnJob['status'][] = ['completed', 'failed'];
// A real try-on API takes roughly 10-40 seconds per image; poll every 2s
// for up to 2 minutes before showing the "still waiting" state.
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120_000;

/**
 * Reads, and while not yet finished polls, a try-on job by id. Polling is
 * bounded: once it times out without the job finishing (for example the
 * worker isn't running), `pollingTimedOut` turns true and the screen shows
 * a "still waiting" state with a manual refresh (`refetch`).
 */
export function useTryOnJobQuery(jobId: string | null) {
  const watchStartedAtRef = useRef<number | null>(null);
  // Remembers *which* job timed out, so switching to another job id starts
  // fresh without resetting state inside an effect.
  const [timedOutJobId, setTimedOutJobId] = useState<string | null>(null);
  const pollingTimedOut = !!jobId && timedOutJobId === jobId;

  useEffect(() => {
    watchStartedAtRef.current = jobId ? Date.now() : null;
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

    const remaining = Math.max(POLL_TIMEOUT_MS - (Date.now() - startedAt), 0);
    const timer = setTimeout(() => setTimedOutJobId(jobId), remaining);
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
