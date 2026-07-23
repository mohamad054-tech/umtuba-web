import { appendAdsOpsAuditRecord } from "./audit";
import {
  evaluateAdsFeatureFlagChange,
  type AdsFeatureFlagKey,
} from "./featureFlags";
import {
  evaluateAdsKillSwitchChange,
  type AdsKillSwitchKey,
} from "./killSwitches";
import {
  evaluateAdsOperationalStateTransition,
  type AdsPlatformOperationalState,
} from "./operationsState";
import {
  assertAdsNotProductionEligible,
  evaluateAdsOperationsReadiness,
} from "./readiness";
import { getAdsOperationsHealthReport } from "./health";

/**
 * Ads Admin Operations Contracts V1 — internal contracts only.
 *
 * No UI. No production HTTP endpoints. No production effects.
 */

export const ADS_ADMIN_OPS_CONTRACT_VERSION = "v1" as const;

export type AdsAdminOpsActorContext = Readonly<{
  actorRef: string;
  correlationId: string;
  recordedAt: string;
}>;

export type AdsAdminOpsCommandResult =
  | Readonly<{
      ok: true;
      contractVersion: typeof ADS_ADMIN_OPS_CONTRACT_VERSION;
      applied: false;
      auditEventId: string;
      message: string;
      productionEnabled: false;
      productionAccepted: false;
      authoritativeProductionServing: false;
      billingEnabled: false;
      deliveryEnabled: false;
    }>
  | Readonly<{
      ok: false;
      message: string;
      issues: readonly string[];
      auditEventId?: string;
    }>;

function success(
  auditEventId: string,
  message: string
): Extract<AdsAdminOpsCommandResult, { ok: true }> {
  return Object.freeze({
    ok: true as const,
    contractVersion: ADS_ADMIN_OPS_CONTRACT_VERSION,
    applied: false as const,
    auditEventId,
    message,
    productionEnabled: false as const,
    productionAccepted: false as const,
    authoritativeProductionServing: false as const,
    billingEnabled: false as const,
    deliveryEnabled: false as const,
  });
}

/** Propose an operational-state transition (never applied in V1). */
export function proposeAdsOperationalStateChange(
  input: AdsAdminOpsActorContext & {
    from: AdsPlatformOperationalState;
    to: AdsPlatformOperationalState;
  }
): AdsAdminOpsCommandResult {
  const evaluation = evaluateAdsOperationalStateTransition({
    from: input.from,
    to: input.to,
  });
  const audit = appendAdsOpsAuditRecord({
    eventType: "operational_state_change",
    actorRef: input.actorRef,
    correlationId: input.correlationId,
    summary: evaluation.ok
      ? `Operational state ${input.from}→${input.to} evaluated.`
      : `Operational state ${input.from}→${input.to} rejected.`,
    accepted: evaluation.ok,
    details: {
      from: input.from,
      to: input.to,
      reason: evaluation.ok ? "evaluated" : evaluation.message,
    },
    recordedAt: input.recordedAt,
  });
  if (!audit.ok) {
    return {
      ok: false,
      message: audit.message,
      issues: audit.issues,
    };
  }
  if (!evaluation.ok) {
    return {
      ok: false,
      message: evaluation.message,
      issues: evaluation.issues,
      auditEventId: audit.record.eventId,
    };
  }
  return success(
    audit.record.eventId,
    "Operational state change recorded (not applied)."
  );
}

/** Propose a feature-flag change (never opens delivery/billing). */
export function proposeAdsFeatureFlagChange(
  input: AdsAdminOpsActorContext & {
    key: AdsFeatureFlagKey;
    enabled: boolean;
  }
): AdsAdminOpsCommandResult {
  const evaluation = evaluateAdsFeatureFlagChange({
    key: input.key,
    enabled: input.enabled,
  });
  const audit = appendAdsOpsAuditRecord({
    eventType: "feature_flag_change",
    actorRef: input.actorRef,
    correlationId: input.correlationId,
    summary: evaluation.ok
      ? `Feature flag ${input.key}=${String(input.enabled)} evaluated.`
      : `Feature flag ${input.key}=${String(input.enabled)} rejected.`,
    accepted: evaluation.ok,
    details: {
      key: input.key,
      enabled: input.enabled,
      reason: evaluation.ok ? evaluation.message : evaluation.message,
    },
    recordedAt: input.recordedAt,
  });
  if (!audit.ok) {
    return {
      ok: false,
      message: audit.message,
      issues: audit.issues,
    };
  }
  if (!evaluation.ok) {
    return {
      ok: false,
      message: evaluation.message,
      issues: evaluation.issues,
      auditEventId: audit.record.eventId,
    };
  }
  return success(audit.record.eventId, evaluation.message);
}

/** Propose a kill-switch change (cannot disengage permanent switches). */
export function proposeAdsKillSwitchChange(
  input: AdsAdminOpsActorContext & {
    key: AdsKillSwitchKey;
    engaged: boolean;
  }
): AdsAdminOpsCommandResult {
  const evaluation = evaluateAdsKillSwitchChange({
    key: input.key,
    engaged: input.engaged,
  });
  const audit = appendAdsOpsAuditRecord({
    eventType: "kill_switch_change",
    actorRef: input.actorRef,
    correlationId: input.correlationId,
    summary: evaluation.ok
      ? `Kill switch ${input.key} engaged=${String(input.engaged)} evaluated.`
      : `Kill switch ${input.key} engaged=${String(input.engaged)} rejected.`,
    accepted: evaluation.ok,
    details: {
      key: input.key,
      engaged: input.engaged,
      reason: evaluation.ok ? evaluation.message : evaluation.message,
    },
    recordedAt: input.recordedAt,
  });
  if (!audit.ok) {
    return {
      ok: false,
      message: audit.message,
      issues: audit.issues,
    };
  }
  if (!evaluation.ok) {
    return {
      ok: false,
      message: evaluation.message,
      issues: evaluation.issues,
      auditEventId: audit.record.eventId,
    };
  }
  return success(audit.record.eventId, evaluation.message);
}

/** Aggregate admin ops inspection bundle (read-only). */
export function getAdsAdminOperationsInspectionBundle(): Readonly<{
  contractVersion: typeof ADS_ADMIN_OPS_CONTRACT_VERSION;
  readiness: ReturnType<typeof evaluateAdsOperationsReadiness>;
  health: ReturnType<typeof getAdsOperationsHealthReport>;
  productionEligible: false;
  productionEnabled: false;
  productionAccepted: false;
  authoritativeProductionServing: false;
  billingEnabled: false;
  deliveryEnabled: false;
}> {
  const readiness = evaluateAdsOperationsReadiness();
  const eligibility = assertAdsNotProductionEligible(readiness);
  if (!eligibility.ok) {
    throw new Error(eligibility.message);
  }
  const health = getAdsOperationsHealthReport();
  return Object.freeze({
    contractVersion: ADS_ADMIN_OPS_CONTRACT_VERSION,
    readiness,
    health,
    productionEligible: false as const,
    productionEnabled: false as const,
    productionAccepted: false as const,
    authoritativeProductionServing: false as const,
    billingEnabled: false as const,
    deliveryEnabled: false as const,
  });
}
