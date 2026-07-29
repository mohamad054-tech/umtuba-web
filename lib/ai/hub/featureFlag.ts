/**
 * Feature flag for UMTUBA AI Hub Foundation.
 * Default: disabled (fail-closed activation).
 */

export type AiHubFlagSource = {
  enabledOverride?: boolean;
  env?: Record<string, string | undefined>;
};

/**
 * ON only when UMTUBA_AI_HUB is "1" or "true".
 */
export function isAiHubEnabled(source: AiHubFlagSource = {}): boolean {
  if (typeof source.enabledOverride === "boolean") {
    return source.enabledOverride;
  }
  const env = source.env ?? process.env;
  const raw = (env.UMTUBA_AI_HUB ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true";
}
