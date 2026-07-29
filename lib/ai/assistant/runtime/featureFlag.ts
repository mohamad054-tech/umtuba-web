/**
 * Feature flag for Assistant Runtime Integration.
 * Default: disabled (fail-closed activation).
 */

export type AssistantRuntimeFlagSource = {
  enabledOverride?: boolean;
  env?: Record<string, string | undefined>;
};

/**
 * ON only when UMTUBA_AI_ASSISTANT_RUNTIME is "1" or "true".
 */
export function isAssistantRuntimeEnabled(
  source: AssistantRuntimeFlagSource = {}
): boolean {
  if (typeof source.enabledOverride === "boolean") {
    return source.enabledOverride;
  }
  const env = source.env ?? process.env;
  const raw = (env.UMTUBA_AI_ASSISTANT_RUNTIME ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true";
}
