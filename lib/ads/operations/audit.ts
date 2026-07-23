/**
 * Ads Operations Audit Foundation V1 — immutable in-process audit records.
 *
 * Records operational proposals (state / flags / kill switches). Never mutates
 * production configuration and never enables serving/billing.
 */

export const ADS_OPS_AUDIT_CONTRACT_VERSION = "v1" as const;

export const ADS_OPS_AUDIT_EVENT_TYPES = [
  "operational_state_change",
  "feature_flag_change",
  "kill_switch_change",
] as const;

export type AdsOpsAuditEventType = (typeof ADS_OPS_AUDIT_EVENT_TYPES)[number];

export type AdsOpsAuditRecord = Readonly<{
  contractVersion: typeof ADS_OPS_AUDIT_CONTRACT_VERSION;
  eventId: string;
  eventType: AdsOpsAuditEventType;
  actorRef: string;
  correlationId: string;
  summary: string;
  accepted: boolean;
  applied: false;
  details: Readonly<Record<string, string | boolean | number | null>>;
  productionEnabled: false;
  productionAccepted: false;
  authoritativeProductionServing: false;
  billingEnabled: false;
  deliveryEnabled: false;
  recordedAt: string;
}>;

const AUDIT_LOG: AdsOpsAuditRecord[] = [];
let auditSequence = 0;

const ACTOR_RE = /^[A-Za-z0-9_.:-]{1,128}$/;
const CORRELATION_RE = /^[A-Za-z0-9_.:-]{1,128}$/;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function nextEventId(recordedAt: string): string {
  auditSequence += 1;
  return `ops-audit-${auditSequence}-${recordedAt}`;
}

export type AdsOpsAuditAppendInput = Readonly<{
  eventType: AdsOpsAuditEventType;
  actorRef: string;
  correlationId: string;
  summary: string;
  accepted: boolean;
  details?: Readonly<Record<string, string | boolean | number | null>>;
  recordedAt: string;
}>;

/**
 * Append an immutable audit record. Never applies production effects.
 */
export function appendAdsOpsAuditRecord(
  input: AdsOpsAuditAppendInput
):
  | { ok: true; record: AdsOpsAuditRecord }
  | { ok: false; message: string; issues: readonly string[] } {
  const issues: string[] = [];
  if (!(ADS_OPS_AUDIT_EVENT_TYPES as readonly string[]).includes(input.eventType)) {
    issues.push("eventType is not a registered ops audit event.");
  }
  if (!isNonEmptyString(input.actorRef) || !ACTOR_RE.test(input.actorRef.trim())) {
    issues.push("actorRef must be 1–128 chars of [A-Za-z0-9_.:-].");
  }
  if (
    !isNonEmptyString(input.correlationId) ||
    !CORRELATION_RE.test(input.correlationId.trim())
  ) {
    issues.push("correlationId must be 1–128 chars of [A-Za-z0-9_.:-].");
  }
  if (!isNonEmptyString(input.summary) || input.summary.trim().length > 512) {
    issues.push("summary must be a non-empty string up to 512 chars.");
  }
  if (
    !isNonEmptyString(input.recordedAt) ||
    Number.isNaN(Date.parse(input.recordedAt))
  ) {
    issues.push("recordedAt must be a valid ISO timestamp.");
  }
  if (typeof input.accepted !== "boolean") {
    issues.push("accepted must be a boolean.");
  }
  if (issues.length > 0) {
    return {
      ok: false,
      message: issues[0] ?? "Invalid ops audit input.",
      issues: Object.freeze(issues),
    };
  }

  const record: AdsOpsAuditRecord = Object.freeze({
    contractVersion: ADS_OPS_AUDIT_CONTRACT_VERSION,
    eventId: nextEventId(input.recordedAt),
    eventType: input.eventType,
    actorRef: input.actorRef.trim(),
    correlationId: input.correlationId.trim(),
    summary: input.summary.trim(),
    accepted: input.accepted,
    applied: false as const,
    details: Object.freeze({ ...(input.details ?? {}) }),
    productionEnabled: false as const,
    productionAccepted: false as const,
    authoritativeProductionServing: false as const,
    billingEnabled: false as const,
    deliveryEnabled: false as const,
    recordedAt: input.recordedAt,
  });
  AUDIT_LOG.push(record);
  return { ok: true, record };
}

/** Read-only view of audit records (newest last). */
export function listAdsOpsAuditRecords(): readonly AdsOpsAuditRecord[] {
  return Object.freeze([...AUDIT_LOG]);
}

/** Test helper — clears in-memory audit log. */
export function resetAdsOpsAuditRecordsForTests(): void {
  AUDIT_LOG.length = 0;
  auditSequence = 0;
}
