import { isLearningVisualDemoForced } from "../productization/env";

/**
 * Explicit demo override only. Missing Supabase env is a labeled
 * fixture fallback in productization, not an automatic prototype mode.
 */
export function isLearningVisualDemoMode(): boolean {
  return isLearningVisualDemoForced();
}
