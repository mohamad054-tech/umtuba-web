import { cookies } from "next/headers";
import { getServerUser } from "../supabase/server";

/**
 * True when the request carries a Supabase SSR auth cookie.
 * Guest traffic has none — calling auth.getUser() would still hit Auth.
 */
export function hasLearningAuthCookie(
  cookieNames: readonly string[]
): boolean {
  return cookieNames.some((name) => name.includes("-auth-token"));
}

/**
 * Learning-only viewer resolution. Guests skip the Auth network roundtrip.
 * When an auth cookie is present, identity is still validated with getUser().
 */
export async function getLearningViewerUser() {
  const jar = await cookies();
  if (!hasLearningAuthCookie(jar.getAll().map((cookie) => cookie.name))) {
    return null;
  }
  return getServerUser();
}
