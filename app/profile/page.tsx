import { redirect } from "next/navigation";
import { getServerUser } from "../../lib/supabase/server";
import { getProfileByIdFromDb } from "../../lib/supabase/profiles";
import { APP_ROUTES, buildCreatorProfileHref } from "../lib/nav";

export const dynamic = "force-dynamic";

/**
 * Bare `/profile` has no public listing — redirect owners to their username
 * profile (or Settings). Signed-out visitors continue through login with a
 * safe return path so mobile Profile `?next=/profile` does not 404.
 */
export default async function ProfileIndexPage() {
  let userId: string | null = null;

  try {
    const user = await getServerUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  if (!userId) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.profile)}`
    );
  }

  try {
    const row = await getProfileByIdFromDb(userId);
    const username = row?.username?.trim();
    if (username) {
      redirect(buildCreatorProfileHref({ username }));
    }
  } catch (error) {
    console.error("[profile] owner redirect failed:", error);
  }

  redirect(APP_ROUTES.settings);
}
