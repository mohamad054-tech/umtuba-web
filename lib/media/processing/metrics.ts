/**
 * Lightweight metrics hooks — counters only, no monitoring stack.
 */

export type MediaMetricsSnapshot = {
  jobsStarted: number;
  jobsCompleted: number;
  jobsFailed: number;
  retries: number;
  /** Sum of processing durations in ms. */
  processingDurationMsTotal: number;
};

type Listener = (snapshot: MediaMetricsSnapshot, delta: Partial<MediaMetricsSnapshot>) => void;

const state: MediaMetricsSnapshot = {
  jobsStarted: 0,
  jobsCompleted: 0,
  jobsFailed: 0,
  retries: 0,
  processingDurationMsTotal: 0,
};

const listeners = new Set<Listener>();

export function getMediaMetrics(): MediaMetricsSnapshot {
  return { ...state };
}

export function resetMediaMetricsForTests(): void {
  state.jobsStarted = 0;
  state.jobsCompleted = 0;
  state.jobsFailed = 0;
  state.retries = 0;
  state.processingDurationMsTotal = 0;
  listeners.clear();
}

export function subscribeMediaMetrics(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(delta: Partial<MediaMetricsSnapshot>): void {
  for (const listener of listeners) {
    try {
      listener(getMediaMetrics(), delta);
    } catch {
      // never break runtime
    }
  }
}

export function metricJobStarted(): void {
  state.jobsStarted += 1;
  emit({ jobsStarted: 1 });
}

export function metricJobCompleted(durationMs: number): void {
  state.jobsCompleted += 1;
  state.processingDurationMsTotal += Math.max(0, durationMs);
  emit({
    jobsCompleted: 1,
    processingDurationMsTotal: Math.max(0, durationMs),
  });
}

export function metricJobFailed(durationMs: number): void {
  state.jobsFailed += 1;
  state.processingDurationMsTotal += Math.max(0, durationMs);
  emit({
    jobsFailed: 1,
    processingDurationMsTotal: Math.max(0, durationMs),
  });
}

export function metricRetry(): void {
  state.retries += 1;
  emit({ retries: 1 });
}
