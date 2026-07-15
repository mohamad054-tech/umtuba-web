import { createBrowserClient } from "@supabase/ssr";
import { requireSupabasePublicEnv } from "../env/supabasePublic";

export function createClient() {
  const { url, publishableKey } = requireSupabasePublicEnv();
  return createBrowserClient(url, publishableKey);
}
