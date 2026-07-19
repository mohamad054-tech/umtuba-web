import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertPlatformAdminDb,
  isPlatformAdminUser,
} from "../ads/adminAuth";

/**
 * Store admin console reuses the platform-admin DB authority
 * (`is_platform_admin` / `platform_admins`) established for Ads admin.
 * JWT/env hints are never sufficient alone.
 */
export { assertPlatformAdminDb, isPlatformAdminUser };

export const ADMIN_STORE_UNAUTHORIZED =
  "You don’t have access to the store moderation console.";

export async function requireStoreAdminDb(
  supabase: SupabaseClient
): Promise<boolean> {
  return assertPlatformAdminDb(supabase);
}
