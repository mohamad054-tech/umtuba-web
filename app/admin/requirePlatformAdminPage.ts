import { redirect } from "next/navigation";
import { assertPlatformAdminDb } from "../../lib/ads/adminAuth";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { APP_ROUTES } from "../lib/nav";

export const ADMIN_CONSOLE_UNAUTHORIZED =
  "You don’t have access to the admin console.";

export async function requirePlatformAdminPage(nextPath: string) {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(nextPath)}`
    );
  }
  const supabase = await createClient();
  // DB is the sole authority — JWT/env hints are never enough.
  const isAdmin = await assertPlatformAdminDb(supabase);
  if (!isAdmin) {
    redirect(
      `${APP_ROUTES.home}?error=${encodeURIComponent(ADMIN_CONSOLE_UNAUTHORIZED)}`
    );
  }
  return { user, supabase };
}
