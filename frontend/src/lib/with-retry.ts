export type WithRetryOptions = {
  maxRetries: number;
  baseDelayMs: number;
  /** Only errors this returns true for are retried — e.g. a network error
   * or a 5xx is worth retrying, a 400 validation error never is. */
  shouldRetry: (error: unknown) => boolean;
};

/**
 * Generic retry-with-exponential-backoff. Not upload-specific — any
 * retriable async operation can use this; the retry *policy* (what counts
 * as worth retrying) is entirely the caller's `shouldRetry` predicate.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: WithRetryOptions): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === options.maxRetries || !options.shouldRetry(error)) {
        throw error;
      }
      const delayMs = options.baseDelayMs * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Unreachable — every loop iteration either returns or throws — but
  // satisfies TypeScript's control-flow analysis for a guaranteed return.
  throw lastError;
}
