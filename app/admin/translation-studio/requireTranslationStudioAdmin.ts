import "server-only";

import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../../lib/store/adminAuth";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import { APP_ROUTES } from "../../lib/nav";
import { TRANSLATION_STUDIO_BASE } from "./TranslationStudioShell";

export type TranslationStudioAdminContext = {
  user: User;
  supabase: SupabaseClient;
};

/**
 * Require authenticated platform admin for Translation Studio.
 * Returns request-scoped Supabase client for dual-read / shadow transports.
 * Unauthenticated → login redirect (no remote compare scheduled by callers).
 */
export async function requireTranslationStudioAdmin(): Promise<TranslationStudioAdminContext> {
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
  return { user, supabase };
}
