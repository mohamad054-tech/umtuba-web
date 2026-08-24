import { isSupabasePublicConfigured } from "../../env/supabasePublic";

export type LearningDataSource = "live" | "demo_fallback";

function readDemoFlag(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_UMTUBA_LEARNING_VISUAL_DEMO ??
    process.env.UMTUBA_LEARNING_VISUAL_DEMO
  );
}

/** Owner/operator override. Never implied by a missing backend. */
export function isLearningVisualDemoForced(): boolean {
  const flag = readDemoFlag();
  return flag === "1" || flag === "true";
}

export function hasLearningBackendEnv(): boolean {
  return isSupabasePublicConfigured();
}

/**
 * Prefer live product data when the public Supabase env is present
 * and demo is not forced. Missing env is a labeled fixture fallback,
 * not a silent prototype short-circuit.
 */
export function shouldPreferLiveLearningData(): boolean {
  return hasLearningBackendEnv() && !isLearningVisualDemoForced();
}
