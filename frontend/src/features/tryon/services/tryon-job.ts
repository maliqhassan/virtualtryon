import { simulateNetworkCall } from '@/lib/mock-network';

import type { CreateTryOnJobInput, TryOnJob, TryOnStepId } from '../types';

const STEPS: TryOnStepId[] = ['reading_measurements', 'draping_fabric', 'matching_light'];
const STEP_DURATION_MS = 700;
const JOB_FAULT_RATE = 0.08; // a generation failure partway through, not a "can't reach the backend" failure

export const TRYON_STEP_LABELS: Record<TryOnStepId, string> = {
  reading_measurements: 'Reading your measurements',
  draping_fabric: 'Draping fabric',
  matching_light: 'Matching light',
};

const MOCK_REASONING_OPTIONS = [
  'The fit looks true to size through the shoulders and waist.',
  'The color reads well against your skin tone in this lighting.',
  'A relaxed drape overall — consider sizing down for a closer fit.',
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * MOCK — stands in for `POST /api/v1/tryon` + `GET /api/v1/tryon/:id`
 * (docs/roadmap/phase-a-core-loop.md Milestone 4), which don't exist yet.
 * A real, in-memory async job: `createTryOnJob` returns immediately and
 * kicks off a background progression that mutates this map over time;
 * `getTryOnJob` reads whatever the progression has reached so far — the
 * same create-then-poll shape the real job pattern uses. Only these two
 * functions' bodies change once real endpoints exist; the polling hook and
 * screens above them don't.
 */
const jobs = new Map<string, TryOnJob>();

export async function createTryOnJob(input: CreateTryOnJobInput): Promise<TryOnJob> {
  const job = await simulateNetworkCall<TryOnJob>(
    () => ({
      id: `mock-tryon-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      status: 'pending',
      stepId: null,
      stepIndex: -1,
      stepCount: STEPS.length,
      progress: 0,
      errorMessage: null,
      completedAt: null,
      result: null,
    }),
    { latencyMs: 400, faultRate: 0.05 },
  );

  jobs.set(job.id, job);
  void runJobProgression(job.id, input);
  return job;
}

export async function getTryOnJob(jobId: string): Promise<TryOnJob> {
  const job = jobs.get(jobId);
  if (!job) throw new Error('Try-on job not found.');
  return { ...job }; // copy — callers must not mutate the stored job directly
}

async function runJobProgression(jobId: string, _input: CreateTryOnJobInput): Promise<void> {
  const update = (patch: Partial<TryOnJob>) => {
    const current = jobs.get(jobId);
    if (!current) return; // job was cleared — nothing left to update
    jobs.set(jobId, { ...current, ...patch });
  };

  update({ status: 'processing' });

  for (let i = 0; i < STEPS.length; i++) {
    await delay(STEP_DURATION_MS);
    update({
      stepId: STEPS[i],
      stepIndex: i,
      progress: Math.round(((i + 1) / STEPS.length) * 100),
    });
  }

  await delay(300);

  if (Math.random() < JOB_FAULT_RATE) {
    update({ status: 'failed', errorMessage: "Couldn't generate your try-on. Please try again." });
    return;
  }

  update({
    status: 'completed',
    completedAt: new Date().toISOString(),
    result: {
      imageUri: null, // no real generation yet — see TryOnResult's doc comment in ../types
      isMock: true,
      mockCaption: 'Mock result — real AI generation lands in a future milestone.',
      reasoning: MOCK_REASONING_OPTIONS[Math.floor(Math.random() * MOCK_REASONING_OPTIONS.length)],
    },
  });
}
