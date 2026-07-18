import { createBrowserClient } from "@supabase/ssr";
import { requireSupabasePublicEnv } from "../env/supabasePublic";

export function createClient() {
  const { url, publishableKey } = requireSupabasePublicEnv();
  return createBrowserClient(url, publishableKey);
}

/**
 * Soft factory for chrome/widgets on public pages.
 * Returns null when public env is missing so Discover/Live do not white-screen.
 */
export function tryCreateClient(): ReturnType<typeof createClient> | null {
  try {
    return createClient();
  } catch {
    return null;
  }
}
