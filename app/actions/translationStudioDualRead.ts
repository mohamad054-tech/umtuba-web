"use server";

/**
 * Platform-admin dual-read compare diagnostic (read-only).
 * JSON authoritative snapshot taken server-side. No browser snapshot payload.
 * No mutations. Does not change persistence mode / does not activate dual_read env.
 */

import { redirect } from "next/navigation";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../lib/store/adminAuth";
import {
  createShadowReconciliationJournal,
  createSupabaseReadRpcTransport,
  fingerprintStudioSnapshot,
  getTranslationStudioWorkflow,
  resolveShadowReconciliationJournalPath,
  runStudioDualReadCompare,
  runWithStudioDualReadTransportAsync,
  type DualReadCompareResult,
} from "../../lib/translationStudio";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { APP_ROUTES } from "../lib/nav";

const STUDIO_BASE = "/admin/translation-studio";

export type DualReadDiagnosticsResult = {
  status: DualReadCompareResult["status"];
  local_hash: string;
  remote_hash: string | null;
  duration_ms: number;
  counts: DualReadCompareResult["counts"];
  category?: DualReadCompareResult["category"];
  message?: string;
};

function authoritativeLocalFromWorkflow() {
  const snap = getTranslationStudioWorkflow().getSnapshot();
  return {
    schemaVersion: 1 as const,
    updatedAt: new Date().toISOString(),
    ...snap,
  };
}

/**
 * Trigger one dual-read comparison now (platform admin only).
 */
export async function runTranslationStudioDualReadCompareAction(): Promise<DualReadDiagnosticsResult> {
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

  const local = authoritativeLocalFromWorkflow();
  const readTransport = createSupabaseReadRpcTransport(supabase);
  const journal = createShadowReconciliationJournal({
    filePath: resolveShadowReconciliationJournalPath(),
  });

  const result = await runWithStudioDualReadTransportAsync(
    readTransport,
    async () =>
      runStudioDualReadCompare({
        local,
        readTransport,
        getShadowJournalEntries: () => journal.readEntries(),
        dualReadJournal: journal,
        getCurrentLocalHash: () =>
          fingerprintStudioSnapshot(authoritativeLocalFromWorkflow()),
      })
  );

  return {
    status: result.status,
    local_hash: result.local_hash,
    remote_hash: result.remote_hash,
    duration_ms: result.duration_ms,
    counts: result.counts,
    category: result.category,
    message: result.message,
  };
}
