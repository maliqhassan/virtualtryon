import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { createTryOnJob } from '../services/tryon-job';
import type { CreateTryOnJobInput, TryOnJob } from '../types';
import { useTryOnJobQuery } from './use-tryon-job-query';

/**
 * A create-mutation feeding the shared polling query (useTryOnJobQuery) —
 * not a single mutation with a fake delay. This is the same async
 * job/poll shape the real endpoints (docs/roadmap Milestone 4) will use;
 * only createTryOnJob/getTryOnJob's implementations change when those exist.
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
  };
}
