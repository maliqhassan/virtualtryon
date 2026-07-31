import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { createTryOnJob } from '../services/tryon-job';
import type { CreateTryOnJobInput, TryOnJob } from '../types';
import { useTryOnJobQuery } from './use-tryon-job-query';

/**
 * A create-mutation feeding the shared polling query (useTryOnJobQuery) —
 * both now call the real backend (backend/app/api/v1/endpoints/inference_jobs.py,
 * Sprint 3/4). `pollingTimedOut`/`refetch` are threaded straight through so
 * the processing screen can show the "hasn't started yet" state and offer
 * a manual Refresh once bounded polling gives up.
 */
export function useTryOnJob() {
  const [jobId, setJobId] = useState<string | null>(null);

  const create = useMutation<TryOnJob, Error, CreateTryOnJobInput>({
    mutationFn: createTryOnJob,
    onSuccess: (job) => setJobId(job.id),
  });

  const jobQuery = useTryOnJobQuery(jobId);

  return {
    start: create.mutate,
    isStarting: create.isPending,
    startError: create.error,
    job: jobQuery.data ?? null,
    pollingTimedOut: jobQuery.pollingTimedOut,
    refetchJob: jobQuery.refetch,
  };
}
