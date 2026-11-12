import { useEffect, useRef, useState } from 'react';

import type { TryOnJobStatus } from '../types';

const TICK_MS = 400;
// Processing eases towards (never reaches) 90%: the last stretch is only
// shown once the server says the job is done. A real try-on takes 5-40 s.
const QUEUED_MAX = 12;
const PROCESSING_MAX = 90;
const PROCESSING_PACE_MS = 15_000;

/**
 * 0-100 for the generating ring (handoff v2.1 change 5), from the job's
 * real status and how long it has been in it, never a looping spinner:
 * queued creeps to 12%, processing eases from 12% towards 90%, completed
 * is 100%. It only ever moves forward.
 */
export function progressFor(
  status: TryOnJobStatus | undefined,
  clock: { total: number; processing: number },
): number {
  if (status === 'completed') return 100;
  const queued = Math.min(QUEUED_MAX, 3 + (clock.total / 1000) * 1.5);
  if (status !== 'processing') return queued;
  const eased = 1 - Math.exp(-clock.processing / PROCESSING_PACE_MS);
  return Math.max(queued, QUEUED_MAX + (PROCESSING_MAX - QUEUED_MAX) * eased);
}

/** The step shown under the ring, as the design names them. */
export function stepFor(progress: number): string {
  if (progress < 35) return 'Reading your pose';
  if (progress < 75) return 'Fitting the fabric';
  return 'Final touches';
}

export function useTryOnProgress(status: TryOnJobStatus | undefined): number {
  // The interval reads the latest status through a ref; time is measured in
  // its callback (never during render).
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const [clock, setClock] = useState({ total: 0, processing: 0 });
  useEffect(() => {
    const start = Date.now();
    let processingStart: number | null = null;
    const timer = setInterval(() => {
      // Done: the ring shows 100% from the status alone; stop re-rendering.
      if (statusRef.current === 'completed' || statusRef.current === 'failed') return;
      const now = Date.now();
      if (statusRef.current === 'processing' && processingStart === null) processingStart = now;
      setClock({ total: now - start, processing: processingStart ? now - processingStart : 0 });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return progressFor(status, clock);
}
