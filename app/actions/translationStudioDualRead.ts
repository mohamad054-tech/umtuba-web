"use server";

/**
 * Platform-admin dual-read compare diagnostic (read-only).
 * Reports breaker state; does not silently hide OPEN breaker.
 * Manual compare still runs (explicit diagnostics), but returns breaker snapshot.
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
  getDualReadObservationBreaker,
  getTranslationStudioWorkflow,
  buildDualReadObserveReadinessReport,
  resolveShadowReconciliationJournalPath,
  resetDualReadObservationBreaker,
  runStudioDualReadCompare,
  runWithStudioDualReadTransportAsync,
  type DualReadCompareResult,
  type DualReadObservationBreakerSnapshot,
  type DualReadObserveReadinessReport,
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
  breaker: DualReadObservationBreakerSnapshot;
  readiness: DualReadObserveReadinessReport;
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
 * Manual path — does not bypass reporting of breaker-open state.
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
    breaker: getDualReadObservationBreaker(),
    readiness: buildDualReadObserveReadinessReport({
      readTransportAvailable: true,
      breaker: getDualReadObservationBreaker(),
    }),
  };
}

/**
 * Explicit admin reset of dual-read observation breaker (server-only).
 * Does not change persistence mode / observe env.
 */
export async function resetTranslationStudioDualReadObservationBreakerAction(): Promise<DualReadObservationBreakerSnapshot> {
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
  return resetDualReadObservationBreaker();
}

/** Sanitized readiness/preflight for admin diagnostics (zero writes). */
export async function getTranslationStudioDualReadObserveReadinessAction(): Promise<DualReadObserveReadinessReport> {
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
  return buildDualReadObserveReadinessReport({
    readTransportAvailable: Boolean(supabase),
    breaker: getDualReadObservationBreaker(),
  });
}
