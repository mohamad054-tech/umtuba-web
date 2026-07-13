export const GLOBAL_PULSE_LABELS = [
  "📹 New video",
  "🔴 Live now",
  "✨ Trending",
  "🌍 New explorer",
] as const;

export type GlobalPulseLabel = (typeof GLOBAL_PULSE_LABELS)[number];

/** How long the floating label stays visible. */
export const ACTIVITY_LABEL_MS = 2000;

/** Soft ring / glow settle duration after activation. */
export const ACTIVITY_PULSE_MS = 2800;

/** Delay between activity triggers (inclusive range). */
export const ACTIVITY_INTERVAL_MIN_MS = 3000;
export const ACTIVITY_INTERVAL_MAX_MS = 6000;

export function pickRandomActivityLabel(
  previous?: string
): GlobalPulseLabel {
  const pool = GLOBAL_PULSE_LABELS.filter((label) => label !== previous);
  const choices = pool.length > 0 ? pool : [...GLOBAL_PULSE_LABELS];
  return choices[Math.floor(Math.random() * choices.length)];
}

export function randomActivityIntervalMs() {
  return (
    ACTIVITY_INTERVAL_MIN_MS +
    Math.random() * (ACTIVITY_INTERVAL_MAX_MS - ACTIVITY_INTERVAL_MIN_MS)
  );
}
