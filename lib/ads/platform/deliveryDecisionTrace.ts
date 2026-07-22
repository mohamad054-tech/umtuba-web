import type { ContractValidationResult } from "./creativeContracts";
import {
  ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
  ADS_DELIVERY_MAX_ID_LENGTH,
  type AdsDeliveryRequest,
} from "./deliveryContracts";
import {
  isAdsDeliveryExclusionReason,
  type AdsDeliveryCandidateReference,
  type AdsDeliveryExclusionReason,
} from "./deliveryEligibilityContracts";
import type {
  AdsCandidateEligibilityDecision,
  AdsEligibilityCandidateState,
  AdsEligibilityRuleId,
} from "./eligibilityRules";
import type { AdsPlatformPlacementId } from "./placementRegistry";

/**
 * Ads Delivery Decision Trace V1 — immutable, privacy-safe diagnostic contracts.
 *
 * Describes how Eligibility Rules V1 classified a candidate. Never changes
 * eligibility outcomes, never selects an ad, never persists, logs, or networks.
 * productionEnabled is always false.
 */

export const ADS_DELIVERY_DECISION_TRACE_VERSION = "v1" as const;

/** Max keys allowed in a single safe-details record. */
export const ADS_DELIVERY_DECISION_TRACE_MAX_DETAIL_KEYS = 8;

/** Max UTF-8 serialized bytes for one safe-details record. */
export const ADS_DELIVERY_DECISION_TRACE_MAX_DETAIL_BYTES = 512;

/** Max string length for any safe-details value or key. */
export const ADS_DELIVERY_DECISION_TRACE_MAX_DETAIL_STRING_LENGTH = 128;

/**
 * Stable trace rule identifiers (capability-oriented).
 * Order mirrors Eligibility Rules V1 evaluation gates (first failure wins).
 */
export const ADS_DELIVERY_DECISION_TRACE_RULE_ORDER = [
  "delivery_enabled",
  "placement_enabled",
  "placement_match",
  "campaign_active",
  "ad_set_active",
  "ad_active",
  "campaign_time_window",
  "ad_set_time_window",
  "budget_available",
  "creative_present",
  "creative_approved",
  "policy_allowed",
  "country_targeting",
  "language_targeting",
  "audience_match",
] as const;

export type AdsDeliveryDecisionTraceRuleId =
  (typeof ADS_DELIVERY_DECISION_TRACE_RULE_ORDER)[number];

export const ADS_DELIVERY_DECISION_TRACE_STEP_OUTCOMES = [
  "passed",
  "failed",
  "skipped",
] as const;

export type AdsDeliveryDecisionTraceStepOutcome =
  (typeof ADS_DELIVERY_DECISION_TRACE_STEP_OUTCOMES)[number];

/**
 * Tiny bounded primitive-only diagnostic bag.
 * No nested objects/arrays. No sensitive identifiers.
 */
export type AdsDeliveryDecisionTraceSafeDetails = Readonly<
  Record<string, string | number | boolean | null>
>;

export type AdsDeliveryDecisionTraceRequestReference = Readonly<{
  /** Placement only — never viewer, session, or device identifiers. */
  placementId: AdsPlatformPlacementId | string;
}>;

export type AdsDeliveryDecisionTraceRuleStep = Readonly<{
  ruleId: AdsDeliveryDecisionTraceRuleId;
  outcome: AdsDeliveryDecisionTraceStepOutcome;
  /** Present only when outcome is "failed". */
  exclusionReason?: AdsDeliveryExclusionReason;
  /** Optional tightly bounded primitive diagnostics. */
  details?: AdsDeliveryDecisionTraceSafeDetails;
}>;

/**
 * Immutable per-candidate decision trace. Never includes a selected ad.
 */
export type AdsDeliveryDecisionTrace = Readonly<{
  traceVersion: typeof ADS_DELIVERY_DECISION_TRACE_VERSION;
  requestReference: AdsDeliveryDecisionTraceRequestReference;
  candidateReference: AdsDeliveryCandidateReference;
  placementId: AdsPlatformPlacementId | string;
  eligible: boolean;
  exclusionReason: AdsDeliveryExclusionReason | null;
  productionEnabled: false;
  /** Copied only from request.currentTimestamp — never system clock. */
  evaluatedAt: string;
  ruleSteps: readonly AdsDeliveryDecisionTraceRuleStep[];
  /** Optional top-level safe diagnostic summary. */
  diagnosticSummary?: AdsDeliveryDecisionTraceSafeDetails;
}>;

export type AdsDeliveryDecisionTraceBuildOutcome =
  | Readonly<{ valid: true; trace: AdsDeliveryDecisionTrace }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

/** Map eligibility matchedRule → trace rule step id. */
const ELIGIBILITY_MATCHED_RULE_TO_TRACE_RULE: Readonly<
  Record<
    Exclude<AdsEligibilityRuleId, "candidate_otherwise_eligible">,
    AdsDeliveryDecisionTraceRuleId
  >
> = Object.freeze({
  delivery_disabled: "delivery_enabled",
  placement_disabled: "placement_enabled",
  placement_mismatch: "placement_match",
  campaign_status_not_active: "campaign_active",
  ad_set_status_not_active: "ad_set_active",
  ad_status_not_active: "ad_active",
  campaign_not_started: "campaign_time_window",
  campaign_expired: "campaign_time_window",
  ad_set_not_started: "ad_set_time_window",
  ad_set_expired: "ad_set_time_window",
  budget_exhausted: "budget_available",
  creative_missing: "creative_present",
  creative_not_approved: "creative_approved",
  policy_blocked: "policy_allowed",
  country_targeting_mismatch: "country_targeting",
  language_targeting_mismatch: "language_targeting",
  audience_mismatch: "audience_match",
});

const SENSITIVE_DETAIL_KEY_PATTERN =
  /^(email|e_?mail|phone|telephone|mobile|name|full_?name|first_?name|last_?name|ip|ip_?address|gps|lat|latitude|lng|lon|longitude|fingerprint|device_?fingerprint|session|session_?id|viewer|viewer_?id|opaque_?viewer_?id|user_?id|user|teen|age|birth|dob|date_?of_?birth|ssn|password|token|secret|cookie|auth)$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isAdsDeliveryDecisionTraceRuleId(
  value: unknown
): value is AdsDeliveryDecisionTraceRuleId {
  return (
    typeof value === "string" &&
    (ADS_DELIVERY_DECISION_TRACE_RULE_ORDER as readonly string[]).includes(
      value
    )
  );
}

function isStepOutcome(
  value: unknown
): value is AdsDeliveryDecisionTraceStepOutcome {
  return (
    typeof value === "string" &&
    (ADS_DELIVERY_DECISION_TRACE_STEP_OUTCOMES as readonly string[]).includes(
      value
    )
  );
}

function parseIsoTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return value;
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function isPrimitiveDetailValue(
  value: unknown
): value is string | number | boolean | null {
  if (value === null) return true;
  if (typeof value === "boolean") return true;
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (typeof value === "string") {
    return value.length <= ADS_DELIVERY_DECISION_TRACE_MAX_DETAIL_STRING_LENGTH;
  }
  return false;
}

/**
 * Validates a safe-details bag. Rejects nested structures, oversized payloads,
 * and known sensitive key names.
 */
export function validateAdsDeliveryDecisionTraceSafeDetails(
  value: unknown,
  fieldName: string
): ContractValidationResult {
  if (value === undefined) {
    return { valid: true };
  }
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [`${fieldName} must be an object when set.`],
    };
  }

  const issues: string[] = [];
  const keys = Object.keys(value);

  if (keys.length > ADS_DELIVERY_DECISION_TRACE_MAX_DETAIL_KEYS) {
    issues.push(
      `${fieldName} exceeds max key count of ${ADS_DELIVERY_DECISION_TRACE_MAX_DETAIL_KEYS}.`
    );
  }

  for (const key of keys) {
    if (
      key.length === 0 ||
      key.length > ADS_DELIVERY_DECISION_TRACE_MAX_DETAIL_STRING_LENGTH
    ) {
      issues.push(
        `${fieldName} key length must be between 1 and ${ADS_DELIVERY_DECISION_TRACE_MAX_DETAIL_STRING_LENGTH}.`
      );
    }
    if (SENSITIVE_DETAIL_KEY_PATTERN.test(key)) {
      issues.push(
        `${fieldName} contains unexpected sensitive field "${key}".`
      );
    }
    const entry = value[key];
    if (Array.isArray(entry) || (typeof entry === "object" && entry !== null)) {
      issues.push(
        `${fieldName}.${key} must be a primitive (string | number | boolean | null).`
      );
      continue;
    }
    if (!isPrimitiveDetailValue(entry)) {
      issues.push(
        `${fieldName}.${key} is not a safe bounded primitive value.`
      );
    }
  }

  try {
    const serialized = JSON.stringify(value);
    if (
      utf8ByteLength(serialized) > ADS_DELIVERY_DECISION_TRACE_MAX_DETAIL_BYTES
    ) {
      issues.push(
        `${fieldName} exceeds max serialized size of ${ADS_DELIVERY_DECISION_TRACE_MAX_DETAIL_BYTES} bytes.`
      );
    }
  } catch {
    issues.push(`${fieldName} is not JSON-serializable.`);
  }

  return issues.length === 0 ? { valid: true } : { valid: false, issues };
}

function validateRuleSteps(
  steps: unknown,
  eligible: boolean,
  finalReason: AdsDeliveryExclusionReason | null,
  issues: string[]
): void {
  if (!Array.isArray(steps)) {
    issues.push("ruleSteps must be an array.");
    return;
  }

  if (steps.length !== ADS_DELIVERY_DECISION_TRACE_RULE_ORDER.length) {
    issues.push(
      `ruleSteps must contain exactly ${ADS_DELIVERY_DECISION_TRACE_RULE_ORDER.length} steps.`
    );
  }

  const seenRuleIds = new Set<string>();
  let failedCount = 0;
  let failedReason: AdsDeliveryExclusionReason | null = null;
  let seenFailure = false;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const prefix = `ruleSteps[${i}]`;
    if (!isRecord(step)) {
      issues.push(`${prefix} must be an object.`);
      continue;
    }

    if (!isAdsDeliveryDecisionTraceRuleId(step.ruleId)) {
      issues.push(`${prefix}.ruleId is not a valid trace rule identifier.`);
    } else {
      if (seenRuleIds.has(step.ruleId)) {
        issues.push(`ruleSteps contain duplicate ruleId "${step.ruleId}".`);
      } else {
        seenRuleIds.add(step.ruleId);
      }

      const expectedRuleId = ADS_DELIVERY_DECISION_TRACE_RULE_ORDER[i];
      if (expectedRuleId !== undefined && step.ruleId !== expectedRuleId) {
        issues.push(
          `${prefix}.ruleId must be "${expectedRuleId}" to preserve stable rule order.`
        );
      }
    }

    if (!isStepOutcome(step.outcome)) {
      issues.push(`${prefix}.outcome must be passed | failed | skipped.`);
      continue;
    }

    if (step.outcome === "failed") {
      failedCount += 1;
      seenFailure = true;
      if (!isAdsDeliveryExclusionReason(step.exclusionReason)) {
        issues.push(
          `${prefix}.exclusionReason is required and must be a valid exclusion reason when outcome is failed.`
        );
      } else {
        failedReason = step.exclusionReason;
      }
    } else if (step.exclusionReason !== undefined) {
      issues.push(
        `${prefix}.exclusionReason must be omitted unless outcome is failed.`
      );
    }

    if (step.outcome === "passed" && seenFailure) {
      issues.push(
        `${prefix}.outcome cannot be passed after a failed step.`
      );
    }
    if (step.outcome === "skipped" && !seenFailure) {
      issues.push(
        `${prefix}.outcome cannot be skipped before the first failed step.`
      );
    }

    const detailsResult = validateAdsDeliveryDecisionTraceSafeDetails(
      step.details,
      `${prefix}.details`
    );
    if (!detailsResult.valid) {
      issues.push(...detailsResult.issues);
    }
  }

  if (failedCount > 1) {
    issues.push("ruleSteps must not contain multiple failed steps.");
  }

  if (eligible === true) {
    if (failedCount !== 0) {
      issues.push("eligible trace must not contain a failed step.");
    }
    if (finalReason !== null) {
      issues.push("eligible trace exclusionReason must be null.");
    }
  } else {
    if (failedCount === 0) {
      issues.push("rejected trace must contain exactly one failed step.");
    }
    if (!isAdsDeliveryExclusionReason(finalReason)) {
      issues.push(
        "rejected trace exclusionReason must be a valid exclusion reason."
      );
    } else if (failedReason !== null && failedReason !== finalReason) {
      issues.push(
        "final exclusionReason is inconsistent with the failed rule step."
      );
    }
  }
}

/**
 * Pure shape validator for Delivery Decision Trace V1.
 * Fail-closed — does not evaluate eligibility or deliver ads.
 */
export function validateAdsDeliveryDecisionTrace(
  input: unknown
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: ["Decision trace must be an object."],
    };
  }

  const issues: string[] = [];

  if (input.traceVersion !== ADS_DELIVERY_DECISION_TRACE_VERSION) {
    issues.push(
      `traceVersion must be "${ADS_DELIVERY_DECISION_TRACE_VERSION}".`
    );
  }

  if (input.productionEnabled !== false) {
    issues.push("productionEnabled must be false.");
  }

  if (typeof input.eligible !== "boolean") {
    issues.push("eligible must be a boolean.");
  }

  if (!parseIsoTimestamp(input.evaluatedAt)) {
    issues.push("evaluatedAt must be a valid ISO-8601 timestamp.");
  }

  if (!isRecord(input.requestReference)) {
    issues.push("requestReference must be an object.");
  } else {
    if (!isNonEmptyString(input.requestReference.placementId)) {
      issues.push(
        "requestReference.placementId is required and must be a non-empty string."
      );
    } else if (
      input.requestReference.placementId.length > ADS_DELIVERY_MAX_ID_LENGTH
    ) {
      issues.push(
        `requestReference.placementId exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
      );
    }
    for (const key of Object.keys(input.requestReference)) {
      if (key !== "placementId") {
        issues.push(
          `requestReference contains unexpected field "${key}".`
        );
      }
    }
  }

  if (!isRecord(input.candidateReference)) {
    issues.push("candidateReference must be an object.");
  } else {
    if (!isNonEmptyString(input.candidateReference.candidateId)) {
      issues.push(
        "candidateReference.candidateId is required and must be a non-empty string."
      );
    } else if (
      input.candidateReference.candidateId.length > ADS_DELIVERY_MAX_ID_LENGTH
    ) {
      issues.push(
        `candidateReference.candidateId exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
      );
    }
    for (const key of Object.keys(input.candidateReference)) {
      if (key !== "candidateId") {
        issues.push(
          `candidateReference contains unexpected field "${key}".`
        );
      }
    }
  }

  if (!isNonEmptyString(input.placementId)) {
    issues.push("placementId is required and must be a non-empty string.");
  } else if (input.placementId.length > ADS_DELIVERY_MAX_ID_LENGTH) {
    issues.push(
      `placementId exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
    );
  }

  if (
    isRecord(input.requestReference) &&
    isNonEmptyString(input.requestReference.placementId) &&
    isNonEmptyString(input.placementId) &&
    input.requestReference.placementId !== input.placementId
  ) {
    issues.push(
      "placementId must match requestReference.placementId."
    );
  }

  if (input.eligible === true) {
    if (input.exclusionReason !== null) {
      issues.push("exclusionReason must be null when eligible is true.");
    }
  } else if (input.eligible === false) {
    if (!isAdsDeliveryExclusionReason(input.exclusionReason)) {
      issues.push(
        "exclusionReason must be a valid exclusion reason when eligible is false."
      );
    }
  }

  // Reject sensitive top-level fields where practical.
  const forbiddenTopLevel = [
    "opaqueViewerId",
    "viewerId",
    "viewer",
    "sessionId",
    "email",
    "phone",
    "ipAddress",
    "gps",
    "fingerprint",
    "selectedCandidate",
    "selectedCandidateId",
  ];
  for (const key of forbiddenTopLevel) {
    if (key in input) {
      issues.push(`Decision trace contains unexpected sensitive field "${key}".`);
    }
  }

  const finalReasonForSteps: AdsDeliveryExclusionReason | null =
    input.eligible === true
      ? null
      : isAdsDeliveryExclusionReason(input.exclusionReason)
        ? input.exclusionReason
        : null;

  validateRuleSteps(
    input.ruleSteps,
    input.eligible === true,
    finalReasonForSteps,
    issues
  );

  const summaryResult = validateAdsDeliveryDecisionTraceSafeDetails(
    input.diagnosticSummary,
    "diagnosticSummary"
  );
  if (!summaryResult.valid) {
    issues.push(...summaryResult.issues);
  }

  return issues.length === 0 ? { valid: true } : { valid: false, issues };
}

function freezeSafeDetails(
  details: AdsDeliveryDecisionTraceSafeDetails | undefined
): AdsDeliveryDecisionTraceSafeDetails | undefined {
  if (details === undefined) {
    return undefined;
  }
  return Object.freeze({ ...details });
}

function freezeTrace(trace: AdsDeliveryDecisionTrace): AdsDeliveryDecisionTrace {
  return Object.freeze({
    ...trace,
    requestReference: Object.freeze({ ...trace.requestReference }),
    candidateReference: Object.freeze({ ...trace.candidateReference }),
    ruleSteps: Object.freeze(
      trace.ruleSteps.map((step) =>
        Object.freeze({
          ...step,
          details: freezeSafeDetails(step.details),
        })
      )
    ),
    diagnosticSummary: freezeSafeDetails(trace.diagnosticSummary),
  });
}

function resolveFailedTraceRuleId(
  matchedRule: AdsCandidateEligibilityDecision["matchedRule"]
): AdsDeliveryDecisionTraceRuleId {
  if (matchedRule === null) {
    // Fail-closed earliest gate when eligibility could not name a rule
    // (e.g. unusable request/candidate shape → exclusionReason "unknown").
    return "delivery_enabled";
  }
  return ELIGIBILITY_MATCHED_RULE_TO_TRACE_RULE[matchedRule];
}

function buildRuleSteps(
  eligibilityResult: AdsCandidateEligibilityDecision
): AdsDeliveryDecisionTraceRuleStep[] {
  if (eligibilityResult.eligible) {
    return ADS_DELIVERY_DECISION_TRACE_RULE_ORDER.map((ruleId) =>
      Object.freeze({
        ruleId,
        outcome: "passed" as const,
      })
    );
  }

  const failedRuleId = resolveFailedTraceRuleId(eligibilityResult.matchedRule);
  const reason = eligibilityResult.exclusionReason;
  if (!isAdsDeliveryExclusionReason(reason)) {
    // Caller validates; return empty to force fail-closed upstream.
    return [];
  }

  let seenFailure = false;
  return ADS_DELIVERY_DECISION_TRACE_RULE_ORDER.map((ruleId) => {
    if (seenFailure) {
      return Object.freeze({
        ruleId,
        outcome: "skipped" as const,
      });
    }
    if (ruleId === failedRuleId) {
      seenFailure = true;
      return Object.freeze({
        ruleId,
        outcome: "failed" as const,
        exclusionReason: reason,
      });
    }
    return Object.freeze({
      ruleId,
      outcome: "passed" as const,
    });
  });
}

/**
 * Builds an immutable privacy-safe decision trace from an eligibility result.
 * Does not re-decide eligibility, mutate inputs, use the system clock, persist,
 * log, or select an advertisement.
 */
export function buildAdsDeliveryDecisionTrace(
  request: AdsDeliveryRequest,
  candidate: AdsEligibilityCandidateState,
  eligibilityResult: AdsCandidateEligibilityDecision
): AdsDeliveryDecisionTraceBuildOutcome {
  const issues: string[] = [];

  if (!isRecord(request)) {
    issues.push("request must be an object.");
  }
  if (!isRecord(candidate)) {
    issues.push("candidate must be an object.");
  }
  if (!isRecord(eligibilityResult)) {
    issues.push("eligibilityResult must be an object.");
  }
  if (issues.length > 0) {
    return { valid: false, issues };
  }

  if (
    eligibilityResult.contractVersion !== ADS_DELIVERY_ENGINE_CONTRACT_VERSION
  ) {
    issues.push(
      `eligibilityResult.contractVersion must be "${ADS_DELIVERY_ENGINE_CONTRACT_VERSION}".`
    );
  }
  if (eligibilityResult.productionEnabled !== false) {
    issues.push("eligibilityResult.productionEnabled must be false.");
  }
  if (typeof eligibilityResult.eligible !== "boolean") {
    issues.push("eligibilityResult.eligible must be a boolean.");
  }

  if (!isNonEmptyString(request.placementId)) {
    issues.push("request.placementId is required.");
  }
  if (!parseIsoTimestamp(request.currentTimestamp)) {
    issues.push("request.currentTimestamp must be a valid ISO-8601 timestamp.");
  }
  if (!isNonEmptyString(candidate.candidateId)) {
    issues.push("candidate.candidateId is required.");
  }
  if (!isNonEmptyString(eligibilityResult.candidateId)) {
    issues.push("eligibilityResult.candidateId is required.");
  }
  if (
    isNonEmptyString(candidate.candidateId) &&
    isNonEmptyString(eligibilityResult.candidateId) &&
    candidate.candidateId !== eligibilityResult.candidateId
  ) {
    issues.push(
      "eligibilityResult.candidateId is inconsistent with candidate.candidateId."
    );
  }

  if (eligibilityResult.eligible === true) {
    if (eligibilityResult.exclusionReason !== null) {
      issues.push(
        "eligible eligibilityResult must have exclusionReason null."
      );
    }
  } else if (eligibilityResult.eligible === false) {
    if (!isAdsDeliveryExclusionReason(eligibilityResult.exclusionReason)) {
      issues.push(
        "rejected eligibilityResult must have a valid exclusionReason."
      );
    }
  }

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  const ruleSteps = buildRuleSteps(eligibilityResult);
  if (ruleSteps.length === 0) {
    return {
      valid: false,
      issues: ["Unable to build rule steps from eligibilityResult."],
    };
  }

  const trace = freezeTrace({
    traceVersion: ADS_DELIVERY_DECISION_TRACE_VERSION,
    requestReference: Object.freeze({
      placementId: request.placementId,
    }),
    candidateReference: Object.freeze({
      candidateId: eligibilityResult.candidateId,
    }),
    placementId: request.placementId,
    eligible: eligibilityResult.eligible,
    exclusionReason: eligibilityResult.exclusionReason,
    productionEnabled: false,
    evaluatedAt: request.currentTimestamp,
    ruleSteps: Object.freeze(ruleSteps),
  });

  const validation = validateAdsDeliveryDecisionTrace(trace);
  if (!validation.valid) {
    return { valid: false, issues: validation.issues };
  }

  return { valid: true, trace };
}
