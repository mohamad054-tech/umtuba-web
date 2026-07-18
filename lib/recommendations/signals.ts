import {
  EARLY_SKIP_DURATION_MS,
  EARLY_SKIP_WATCH_PERCENT,
  REWATCH_COUNT_CAP,
  WATCH_SIGNAL_WEIGHTS,
} from "./weights";
import type { WatchSignalInput } from "./types";

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function deriveSkippedEarly(input: {
  watchPercent: number;
  watchDurationMs: number;
  completed: boolean;
  skippedEarly?: boolean | null;
}): boolean {
  if (typeof input.skippedEarly === "boolean") {
    return input.skippedEarly && !input.completed;
  }
  return (
    !input.completed &&
    input.watchPercent < EARLY_SKIP_WATCH_PERCENT &&
    input.watchDurationMs < EARLY_SKIP_DURATION_MS
  );
}

export function normalizeWatchSignal(
  input: WatchSignalInput
): WatchSignalInput & { skippedEarly: boolean } {
  const watchPercent = clampPercent(input.watchPercent);
  const watchDurationMs = Math.max(0, Math.floor(input.watchDurationMs || 0));
  const rewatchCount = Math.max(0, Math.floor(input.rewatchCount || 0));
  const completed = Boolean(input.completed);
  const skippedEarly = deriveSkippedEarly({
    watchPercent,
    watchDurationMs,
    completed,
    skippedEarly: input.skippedEarly,
  });

  return {
    ...input,
    watchPercent,
    watchDurationMs,
    rewatchCount,
    completed,
    liked: Boolean(input.liked),
    saved: Boolean(input.saved),
    shared: Boolean(input.shared),
    commented: Boolean(input.commented),
    followAfterWatch: Boolean(input.followAfterWatch),
    skippedEarly,
  };
}

/**
 * Deterministic 0–1 quality from a single watch session signal.
 */
export function scoreWatchSignalQuality(
  input: WatchSignalInput
): number {
  const signal = normalizeWatchSignal(input);
  const rewatchNorm = clamp01(signal.rewatchCount / REWATCH_COUNT_CAP);

  const raw =
    (signal.watchPercent / 100) * WATCH_SIGNAL_WEIGHTS.watchPercent +
    (signal.completed ? 1 : 0) * WATCH_SIGNAL_WEIGHTS.completed +
    rewatchNorm * WATCH_SIGNAL_WEIGHTS.rewatchCount +
    (signal.liked ? 1 : 0) * WATCH_SIGNAL_WEIGHTS.liked +
    (signal.saved ? 1 : 0) * WATCH_SIGNAL_WEIGHTS.saved +
    (signal.shared ? 1 : 0) * WATCH_SIGNAL_WEIGHTS.shared +
    (signal.commented ? 1 : 0) * WATCH_SIGNAL_WEIGHTS.commented +
    (signal.followAfterWatch ? 1 : 0) * WATCH_SIGNAL_WEIGHTS.followAfterWatch +
    (signal.skippedEarly ? 1 : 0) * WATCH_SIGNAL_WEIGHTS.skippedEarly;

  return clamp01(raw);
}

export function isValidWatchSessionId(sessionId: string): boolean {
  const trimmed = sessionId.trim();
  return trimmed.length >= 8 && trimmed.length <= 64;
}
