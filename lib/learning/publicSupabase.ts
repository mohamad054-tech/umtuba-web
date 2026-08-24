import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireSupabasePublicEnv } from "../env/supabasePublic";

/** Cookie-free anon client for public Learning catalog reads. */
export function createLearningPublicClient(): SupabaseClient {
  const { url, publishableKey } = requireSupabasePublicEnv();
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
