import { redirect } from "next/navigation";
import {
  ADMIN_ADS_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../../lib/ads/adminAuth";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import { APP_ROUTES } from "../../lib/nav";

export async function requireAdminAdsSession() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.adminAds)}`
    );
  }
  const supabase = await createClient();
  // DB is the sole authority — JWT/env hints are never enough.
  const isAdmin = await assertPlatformAdminDb(supabase);
  if (!isAdmin) {
    redirect(
      `${APP_ROUTES.home}?error=${encodeURIComponent(ADMIN_ADS_UNAUTHORIZED)}`
    );
  }
  return { user, supabase };
}
