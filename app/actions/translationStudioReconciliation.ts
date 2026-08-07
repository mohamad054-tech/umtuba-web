"use server";

/**
 * Platform-admin read-only reconciliation report action.
 * No mutations. No arbitrary browser snapshot payload.
 */

import { redirect } from "next/navigation";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../lib/store/adminAuth";
import {
  buildStudioReconciliationReport,
  createSupabaseReadRpcTransport,
  getTranslationStudioWorkflow,
  runWithStudioDualReadTransportAsync,
  type BuildReconciliationReportResult,
} from "../../lib/translationStudio";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { APP_ROUTES } from "../lib/nav";

const STUDIO_BASE = "/admin/translation-studio";

/**
 * Compare authoritative Studio JSON (workflow snapshot) to remote read RPC.
 */
export async function generateTranslationStudioReconciliationReportAction(): Promise<BuildReconciliationReportResult> {
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

  const snap = getTranslationStudioWorkflow().getSnapshot();
  const local = {
    schemaVersion: 1 as const,
    updatedAt: new Date().toISOString(),
    ...snap,
  };
  const readTransport = createSupabaseReadRpcTransport(supabase);
  return runWithStudioDualReadTransportAsync(readTransport, () =>
    buildStudioReconciliationReport({ local, readTransport })
  );
}
