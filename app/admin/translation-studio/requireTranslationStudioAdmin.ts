import "server-only";

import { redirect } from "next/navigation";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../../lib/store/adminAuth";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import { APP_ROUTES } from "../../lib/nav";
import { TRANSLATION_STUDIO_BASE } from "./TranslationStudioShell";

export async function requireTranslationStudioAdmin(): Promise<void> {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(TRANSLATION_STUDIO_BASE)}`
    );
  }
  const supabase = await createClient();
  const isAdmin = await assertPlatformAdminDb(supabase);
  if (!isAdmin) {
    redirect(
      `${APP_ROUTES.home}?error=${encodeURIComponent(ADMIN_STORE_UNAUTHORIZED)}`
    );
  }
}
