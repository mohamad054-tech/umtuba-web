"use server";

/**
 * Admin-only isolated shadow dual-write smoke V1.
 * Fixed internal snapshot only — no caller-supplied IDs/payload.
 * Uses the authenticated cookie/JWT Supabase client only. No permanent UI.
 */

import { redirect } from "next/navigation";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../lib/store/adminAuth";
import {
  cleanupShadowSmokeV1JsonLocal,
  createSupabaseWriteRpcTransport,
  runIsolatedShadowSmokeV1,
  type IsolatedShadowSmokeV1Result,
} from "../../lib/translationStudio";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { APP_ROUTES } from "../lib/nav";

const STUDIO_BASE = "/admin/translation-studio";

/**
 * Execute one controlled isolated shadow smoke write.
 * Requires:
 * - authenticated platform admin
 * - UMTUBA_TRANSLATION_STUDIO_ALLOW_SHADOW_SMOKE=true
 * - UMTUBA_TRANSLATION_STUDIO_PERSISTENCE_MODE=shadow_dual_write
 */
export async function runTranslationStudioIsolatedShadowSmokeV1Action(): Promise<IsolatedShadowSmokeV1Result> {
  const user = await getServerUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(STUDIO_BASE)}`);
  }

  const supabase = await createClient();
  const isAdmin = await assertPlatformAdminDb(supabase);
  if (!isAdmin) {
    redirect(
      `${APP_ROUTES.home}?error=${encodeURIComponent(ADMIN_STORE_UNAUTHORIZED)}`
    );
  }

  const transport = createSupabaseWriteRpcTransport(supabase);
  return runIsolatedShadowSmokeV1({
    actorId: user.id,
    transport,
  });
}

/**
 * Remove only local shadow-smoke-v1.json.
 * Never deletes store.json or remote rows.
 */
export async function cleanupTranslationStudioIsolatedShadowSmokeV1LocalAction(): Promise<{
  ok: true;
  removed: boolean;
  path: string;
}> {
  const user = await getServerUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(STUDIO_BASE)}`);
  }

  const supabase = await createClient();
  const isAdmin = await assertPlatformAdminDb(supabase);
  if (!isAdmin) {
    redirect(
      `${APP_ROUTES.home}?error=${encodeURIComponent(ADMIN_STORE_UNAUTHORIZED)}`
    );
  }

  const result = cleanupShadowSmokeV1JsonLocal();
  return { ok: true, ...result };
}
