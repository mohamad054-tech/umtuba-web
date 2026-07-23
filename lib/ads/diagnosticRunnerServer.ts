import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { assertPlatformAdminDb } from "./adminAuth";
import { ADS_ERRORS } from "./errors";
import {
  assertAdsInventoryBridgeNonAuthoritative,
  loadAdsInventoryBridgeForAdvertiser,
} from "./inventoryBridge";
import {
  assertDiagnosticDeliveryKillSwitchClosed,
  assertDiagnosticReportNonAuthoritative,
  buildAdsDiagnosticReportV1,
  buildDiagnosticCanonicalStackInput,
  isAdsDiagnosticUuid,
  parseAdsDiagnosticRequestV1,
  resolveDiagnosticCorrelationId,
  scopeDiagnosticSelectionInventory,
  type AdsDiagnosticRunnerOutcome,
} from "./diagnosticRunner";
import { runAdsCanonicalStackV1 } from "./platform/canonicalStack";
import { getCanonicalPlacement } from "./platform/taxonomyMapper";

type AnyClient = SupabaseClient;

/**
 * Server-only authorized Diagnostic Runner entrypoint.
 *
 * DB-backed `assertPlatformAdminDb` runs at this boundary before any inventory
 * load. Callers cannot pass a forged `platformAdminVerified` gate.
 */

export async function executeAdsDiagnosticRunnerV1(
  supabase: AnyClient,
  input: {
    /** Must match the authenticated session user id. */
    adminUserId: string;
    request: unknown;
  }
): Promise<AdsDiagnosticRunnerOutcome> {
  if (!isAdsDiagnosticUuid(input.adminUserId)) {
    return {
      ok: false,
      message: "Only platform admins may execute Ads diagnostics.",
      issues: Object.freeze(["adminUserId must be a valid UUID."]),
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user || user.id !== input.adminUserId.trim()) {
    return {
      ok: false,
      message: "Only platform admins may execute Ads diagnostics.",
      issues: Object.freeze([
        "Authenticated session does not match adminUserId.",
      ]),
    };
  }

  // Authoritative DB check — never trust JWT hints or caller-forged objects.
  const isAdmin = await assertPlatformAdminDb(supabase);
  if (!isAdmin) {
    return {
      ok: false,
      message: "Only platform admins may execute Ads diagnostics.",
      issues: Object.freeze(["assertPlatformAdminDb returned false."]),
    };
  }

  const killSwitch = assertDiagnosticDeliveryKillSwitchClosed();
  if (!killSwitch.ok) {
    return {
      ok: false,
      message: killSwitch.message,
      issues: killSwitch.issues,
    };
  }

  const parsed = parseAdsDiagnosticRequestV1(input.request);
  if (!parsed.ok) {
    return {
      ok: false,
      message: parsed.message,
      issues: parsed.issues,
    };
  }
  const request = parsed.request;

  let placementId: string;
  try {
    placementId = getCanonicalPlacement(request.placement);
  } catch {
    return {
      ok: false,
      message: `Unsupported placement "${request.placement}".`,
    };
  }

  const correlationId = resolveDiagnosticCorrelationId({
    request,
    adminUserId: input.adminUserId.trim(),
    placementId,
  });

  const bridgeLoad = await loadAdsInventoryBridgeForAdvertiser(supabase, {
    advertiserAccountId: request.advertiserAccountId,
    currentTimestamp: request.currentTimestamp,
    sourceId: `diagnostic:${request.advertiserAccountId}`,
    revision: 1,
  });
  if (!bridgeLoad.ok) {
    return {
      ok: false,
      message: bridgeLoad.message,
      issues: bridgeLoad.issues,
    };
  }

  const bridgeAuthority = assertAdsInventoryBridgeNonAuthoritative(
    bridgeLoad.result
  );
  if (!bridgeAuthority.ok) {
    return {
      ok: false,
      message: ADS_ERRORS.loadFailed,
      issues: bridgeAuthority.issues,
    };
  }

  // Use correlationId as inventory sourceId (already length/charset-validated)
  // so provenance inventorySourceId stays within ADS_DELIVERY_MAX_ID_LENGTH.
  const scopedInventory = scopeDiagnosticSelectionInventory({
    bridge: bridgeLoad.result,
    placementId,
    campaignId: request.campaignId ?? null,
    adSetId: request.adSetId ?? null,
    candidateLimit: request.candidateLimit ?? null,
    sourceId: correlationId,
  });

  const stackInput = buildDiagnosticCanonicalStackInput({
    inventory: scopedInventory,
    placementId,
    correlationId,
    currentTimestamp: request.currentTimestamp,
  });

  // Sole decision engine — no alternate pipeline.
  const canonicalOutcome = runAdsCanonicalStackV1(stackInput);

  const report = buildAdsDiagnosticReportV1({
    request,
    adminUserId: input.adminUserId.trim(),
    correlationId,
    placementId,
    bridge: bridgeLoad.result,
    scopedInventory,
    canonicalOutcome,
  });

  const reportAuthority = assertDiagnosticReportNonAuthoritative(report);
  if (!reportAuthority.ok) {
    return { ok: false, message: reportAuthority.message };
  }

  return { ok: true, report };
}
