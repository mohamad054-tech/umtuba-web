import { ADS_REPORTING_AUTHORITY } from "./authority";
import {
  validateAdsReportingRequest,
  type AdsReportingValidationReport,
} from "./validation";

/**
 * Internal admin contracts for Reporting & Analytics Foundation V1.
 * Inspection/proposal only. No production APIs, public endpoints, or UI.
 */

export const ADS_REPORTING_ADMIN_CONTRACT_VERSION = "v1" as const;

export type AdsReportingAdminActorContext = Readonly<{
  actorRef: string;
  correlationId: string;
}>;

export type AdsReportingAdminInspectResult = Readonly<{
  contractVersion: typeof ADS_REPORTING_ADMIN_CONTRACT_VERSION;
  validation: AdsReportingValidationReport;
  productionEnabled: false;
  productionAccepted: false;
  authoritativeProductionServing: false;
  billingEnabled: false;
  deliveryEnabled: false;
  triggersMeasurementIngestion: false;
  sourcesLiveDelivery: false;
  mutatesDatabase: false;
}>;

export type AdsReportingAdminProposeExportResult =
  | Readonly<{
      ok: true;
      contractVersion: typeof ADS_REPORTING_ADMIN_CONTRACT_VERSION;
      format: "csv" | "json";
      applied: false;
      generatesFile: false;
      productionEnabled: false;
      deliveryEnabled: false;
      billingEnabled: false;
      productionAccepted: false;
      authoritativeProductionServing: false;
      message: string;
    }>
  | Readonly<{
      ok: false;
      message: string;
      issues: readonly string[];
    }>;

const ACTOR_RE = /^[A-Za-z0-9_.:-]{1,128}$/;

function assertActor(
  input: AdsReportingAdminActorContext
): { ok: true } | { ok: false; message: string; issues: readonly string[] } {
  if (
    !ACTOR_RE.test(input.actorRef.trim()) ||
    !ACTOR_RE.test(input.correlationId.trim())
  ) {
    return {
      ok: false,
      message: "Invalid admin actor context.",
      issues: Object.freeze([
        "actorRef and correlationId must be 1–128 chars of [A-Za-z0-9_.:-].",
      ]),
    };
  }
  return { ok: true };
}

/** Inspect/validate a reporting request bundle (read-only). */
export function inspectAdsReportingRequest(
  input: AdsReportingAdminActorContext & { request: unknown }
):
  | AdsReportingAdminInspectResult
  | { ok: false; message: string; issues: readonly string[] } {
  const actor = assertActor(input);
  if (!actor.ok) return actor;
  const validation = validateAdsReportingRequest(input.request);
  return Object.freeze({
    contractVersion: ADS_REPORTING_ADMIN_CONTRACT_VERSION,
    validation,
    ...ADS_REPORTING_AUTHORITY,
  });
}

/**
 * Propose an export for a validated reporting request.
 * Never generates files (`applied: false`, `generatesFile: false`).
 */
export function proposeAdsReportingExport(
  input: AdsReportingAdminActorContext & { request: unknown }
): AdsReportingAdminProposeExportResult {
  const actor = assertActor(input);
  if (!actor.ok) return actor;

  const validation = validateAdsReportingRequest(input.request);
  if (!validation.ok || !validation.request) {
    return {
      ok: false,
      message: validation.issues[0] ?? "Reporting request invalid.",
      issues: validation.issues,
    };
  }

  return Object.freeze({
    ok: true as const,
    contractVersion: ADS_REPORTING_ADMIN_CONTRACT_VERSION,
    format: validation.request.export.format,
    applied: false as const,
    generatesFile: false as const,
    ...ADS_REPORTING_AUTHORITY,
    message:
      "Export proposal evaluated only; Reporting Foundation V1 never generates files or sources live delivery.",
  });
}
