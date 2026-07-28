/**
 * UserMenu Capability Links V1 — resolve chrome menu visibility from
 * existing helpers only (no new role system / migrations / tables).
 *
 * Gaps intentionally preserved:
 * - Advertise stays visible for signed-in users (public `/advertise` landing
 *   is the apply entry; no hide-eligibility SoT in product chrome).
 * - Admin Store remains reachable by URL; menu exposes Admin Ads hub only.
 */

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { assertPlatformAdminDb } from "../../../lib/ads/adminAuth";
import { listInstructorAuthorableCourses } from "../../../lib/learning/instructorAuthoring";
import { getLatestSellerApplication } from "../../../lib/store/sellerApplications";
import { getOwnedOrMemberStore } from "../../../lib/store/sellerStore";

export type UserMenuCapabilities = {
  /** Signed-in users may create content (`/create` is auth-gated). */
  showCreate: boolean;
  /** Same gate as Learning hub: authorable courses via RLS. */
  showInstructor: boolean;
  /** Authoritative `is_platform_admin` RPC (UX only; pages re-check). */
  showAdmin: boolean;
  /** Same interest signals as `/seller` hub: membership or application. */
  showSeller: boolean;
  /**
   * Advertise landing remains available (apply + dashboard entry).
   * Not hidden — no reliable “must be advertiser” chrome SoT.
   */
  showAdvertise: boolean;
};

/** Defaults while resolving / for contract tests without async. */
export const USER_MENU_CAPABILITIES_NONE: UserMenuCapabilities = {
  showCreate: false,
  showInstructor: false,
  showAdmin: false,
  showSeller: false,
  showAdvertise: false,
};

/** Signed-in baseline before optional capability links. */
export const USER_MENU_CAPABILITIES_SIGNED_IN_BASE: UserMenuCapabilities = {
  showCreate: true,
  showInstructor: false,
  showAdmin: false,
  showSeller: false,
  showAdvertise: true,
};

export async function resolveUserMenuCapabilities(
  supabase: SupabaseClient,
  user: User
): Promise<UserMenuCapabilities> {
  const [instructorResult, isAdmin, membership, application] =
    await Promise.all([
      listInstructorAuthorableCourses(supabase),
      assertPlatformAdminDb(supabase),
      getOwnedOrMemberStore(supabase, user.id),
      getLatestSellerApplication(supabase, user.id),
    ]);

  const instructorCourses =
    instructorResult.ok && Array.isArray(instructorResult.data)
      ? instructorResult.data
      : [];

  return {
    showCreate: true,
    showInstructor: instructorCourses.length > 0,
    showAdmin: isAdmin === true,
    showSeller: Boolean(membership || application),
    showAdvertise: true,
  };
}
