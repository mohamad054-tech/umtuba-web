/**
 * Feature flag / activation contract for Video Personalization Integration.
 * Default: disabled — production feed order unchanged.
 */

export type VideoPersonalizationFlagSource = {
  /**
   * Explicit override for tests.
   * `undefined` → read env.
   */
  enabledOverride?: boolean;
  env?: Record<string, string | undefined>;
};

/**
 * Integration is ON only when UMTUBA_AI_VIDEO_PERSONALIZATION is "1" or "true".
 * Missing / any other value → disabled (fail-closed activation).
 */
export function isVideoPersonalizationIntegrationEnabled(
  source: VideoPersonalizationFlagSource = {}
): boolean {
  if (typeof source.enabledOverride === "boolean") {
    return source.enabledOverride;
  }
  const env = source.env ?? process.env;
  const raw = (env.UMTUBA_AI_VIDEO_PERSONALIZATION ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true";
}
