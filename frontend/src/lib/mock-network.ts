/**
 * Shared by every mocked backend call (user-photo's and garment's "prepare"
 * services, and any future one) until real endpoints exist. Centralizes the
 * simulated latency and the deliberate fault-injection rate so the
 * error-handling UI stays exercisable in every feature without a real
 * backend to fail against — remove per-call-site once each mock is replaced
 * by a real request.
 */
export type MockNetworkOptions = {
  latencyMs?: number;
  faultRate?: number;
};

const DEFAULT_LATENCY_MS = 900;
const DEFAULT_FAULT_RATE = 0.08;

export async function simulateNetworkCall<T>(
  produceResponse: () => T,
  options: MockNetworkOptions = {},
): Promise<T> {
  const latencyMs = options.latencyMs ?? DEFAULT_LATENCY_MS;
  const faultRate = options.faultRate ?? DEFAULT_FAULT_RATE;

  await new Promise((resolve) => setTimeout(resolve, latencyMs));

  if (Math.random() < faultRate) {
    throw new Error('Simulated network fault (mock)');
  }

  return produceResponse();
}
