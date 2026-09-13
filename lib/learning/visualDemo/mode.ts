/**
 * Local visual-demo gate. Never writes to production.
 * On without secrets when Supabase public URL is absent.
 */
export function isLearningVisualDemoMode(): boolean {
  const flag =
    process.env.NEXT_PUBLIC_UMTUBA_LEARNING_VISUAL_DEMO ??
    process.env.UMTUBA_LEARNING_VISUAL_DEMO;
  if (flag === "1" || flag === "true") return true;
  if (flag === "0" || flag === "false") return false;
  return !process.env.NEXT_PUBLIC_SUPABASE_URL;
}
