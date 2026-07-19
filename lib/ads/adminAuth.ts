import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Platform admin identity for Ads Admin Review Foundation V1.
 *
 * Database authority (required for any privileged RPC / data access):
 *   public.platform_admins + is_platform_admin(auth.uid())
 *
 * Next.js UX hints (never sufficient alone — always re-check DB):
 * - auth.app_metadata.platform_admin = true | "true" | "1"
 * - auth.app_metadata.role = "platform_admin"
 * - optional env allowlist UMTUBA_PLATFORM_ADMIN_IDS (comma-separated UUIDs)
 */

function parseAllowlist(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean)
  );
}

/** JWT / env hint only — not authorization. Prefer assertPlatformAdminDb. */
export function isPlatformAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;

  const meta = user.app_metadata ?? {};
  const flag = meta.platform_admin;
  if (flag === true || flag === "true" || flag === "1" || flag === 1) {
    return true;
  }
  if (meta.role === "platform_admin") {
    return true;
  }

  const allowlist = parseAllowlist(process.env.UMTUBA_PLATFORM_ADMIN_IDS);
  if (allowlist.has(user.id.toLowerCase())) {
    return true;
  }

  return false;
}

/** Authoritative check: SECURITY DEFINER RPC reads platform_admins. */
export async function assertPlatformAdminDb(
  supabase: SupabaseClient
): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error) {
    console.error("assertPlatformAdminDb", error);
    return false;
  }
  return data === true;
}

export const ADMIN_ADS_UNAUTHORIZED =
  "You don’t have access to the ads admin console.";
