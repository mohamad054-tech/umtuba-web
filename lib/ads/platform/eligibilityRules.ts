import {
  ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
  type AdsDeliveryRequest,
} from "./deliveryContracts";
import type { AdsDeliveryExclusionReason } from "./deliveryEligibilityContracts";
import {
  getAdsPlacement,
  isAdsPlacementId,
  type AdsPlatformPlacementId,
} from "./placementRegistry";

/**
 * Ads Eligibility Rules Foundation V1 — pure, deterministic, fail-closed.
 *
 * Evaluates candidate metadata against a delivery request and returns an
 * eligibility decision only. Never selects, ranks, scores, auctions, paces,
 * charges, or serves ads. Never reads the system clock; time comes only from the
 * request's currentTimestamp.
 */

/** Only this lifecycle status is treated as active. All others fail closed. */
export const ADS_ELIGIBILITY_ACTIVE_STATUS = "active" as const;

/** Feature-flag key that must be explicitly true for delivery to proceed past rule 1. */
export const ADS_ELIGIBILITY_DELIVERY_FLAG_KEY = "ADS_DELIVERY_ENABLED" as const;

/**
 * Stable rule evaluation order (first match wins).
 * Documented for tests and future engines — do not reorder lightly.
 */
export const ADS_ELIGIBILITY_RULE_ORDER = [
  "delivery_disabled",
  "placement_disabled",
  "placement_mismatch",
  "campaign_status_not_active",
  "ad_set_status_not_active",
  "ad_status_not_active",
  "campaign_not_started",
  "campaign_expired",
  "ad_set_not_started",
  "ad_set_expired",
  "budget_exhausted",
  "creative_missing",
  "creative_not_approved",
  "policy_blocked",
  "country_targeting_mismatch",
  "language_targeting_mismatch",
  "audience_mismatch",
  "candidate_otherwise_eligible",
] as const;

export type AdsEligibilityRuleId = (typeof ADS_ELIGIBILITY_RULE_ORDER)[number];

/**
 * Metadata-only candidate state for eligibility evaluation.
 * No ORM entities, DB rows, or product imports.
 */
export type AdsEligibilityCandidateState = Readonly<{
  candidateId: string;
  campaignId: string;
  adSetId: string;
  adId: string;
  creativeId: string;
  /** Placement this candidate is bound to. */
  placementId: AdsPlatformPlacementId | string;
  campaignStatus: string;
  adSetStatus: string;
  adStatus: string;
  /** ISO-8601 campaign schedule start (inclusive). */
  campaignStartsAt: string;
  /** ISO-8601 campaign schedule end (exclusive), or null for open-ended. */
  campaignEndsAt: string | null;
  /** ISO-8601 ad-set schedule start (inclusive). */
  adSetStartsAt: string;
  /** ISO-8601 ad-set schedule end (exclusive), or null for open-ended. */
  adSetEndsAt: string | null;
  /** Upstream budget-exhausted marker — not computed here. */
  budgetExhausted: boolean;
  creativePresent: boolean;
  creativeApproved: boolean;
  policyBlocked: boolean;
  /**
   * Country allowlist. Empty array means unrestricted (explicit contract).
   * Entries must be ISO-like two-letter codes (normalized to uppercase).
   */
  targetedCountryCodes: readonly string[];
  /**
   * Language allowlist. Empty array means unrestricted (explicit contract).
   *
   * Match semantics (deterministic):
   * - Compare case-insensitively after trim.
   * - Exact tag match always succeeds (e.g. `en-US` ↔ `en-US`).
   * - A primary-only target (no region, e.g. `en`) matches any request whose
   *   primary subtag equals that primary (e.g. `en` matches `en` and `en-US`).
   * - Region-specific targets (e.g. `en-GB`) require exact tag match.
   */
  targetedLanguageCodes: readonly string[];
  /**
   * Upstream audience match marker — not computed here.
   * Must be boolean `true` to pass; `false` → audience_mismatch;
   * missing/non-boolean → unknown (fail closed).
   */
  audienceMatched: boolean;
}>;

/**
 * Per-candidate eligibility decision. Never includes a selected/served ad.
 * productionEnabled is always false in V1.
 */
export type AdsCandidateEligibilityDecision = Readonly<{
  contractVersion: typeof ADS_DELIVERY_ENGINE_CONTRACT_VERSION;
  candidateId: string;
  eligible: boolean;
  /** Set when eligible is false; null when eligible. */
  exclusionReason: AdsDeliveryExclusionReason | null;
  /**
   * First matching rule id when a documented rule excludes the candidate.
   * Null when eligible, or when the candidate/request shape is unusable
   * (fail-closed with exclusionReason `"unknown"`).
   */
  matchedRule: Exclude<
    AdsEligibilityRuleId,
    "candidate_otherwise_eligible"
  > | null;
  productionEnabled: false;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseIsoTimestampMs(value: unknown): number | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}

function decision(
  candidateId: string,
  exclusionReason: AdsDeliveryExclusionReason | null,
  matchedRule: AdsCandidateEligibilityDecision["matchedRule"]
): AdsCandidateEligibilityDecision {
  return Object.freeze({
    contractVersion: ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
    candidateId,
    eligible: exclusionReason === null,
    exclusionReason,
    matchedRule,
    productionEnabled: false as const,
  });
}

function excluded(
  candidateId: string,
  reason: AdsDeliveryExclusionReason,
  matchedRule: NonNullable<AdsCandidateEligibilityDecision["matchedRule"]>
): AdsCandidateEligibilityDecision {
  return decision(candidateId, reason, matchedRule);
}

function eligible(candidateId: string): AdsCandidateEligibilityDecision {
  return decision(candidateId, null, null);
}

function hasRequiredCandidateShape(
  candidate: unknown
): candidate is AdsEligibilityCandidateState {
  if (!isRecord(candidate)) {
    return false;
  }
  const requiredStrings = [
    "candidateId",
    "campaignId",
    "adSetId",
    "adId",
    "creativeId",
    "placementId",
    "campaignStatus",
    "adSetStatus",
    "adStatus",
    "campaignStartsAt",
    "adSetStartsAt",
  ] as const;

  for (const key of requiredStrings) {
    if (!isNonEmptyString(candidate[key])) {
      return false;
    }
  }

  if (
    candidate.campaignEndsAt !== null &&
    !isNonEmptyString(candidate.campaignEndsAt)
  ) {
    return false;
  }
  if (
    candidate.adSetEndsAt !== null &&
    !isNonEmptyString(candidate.adSetEndsAt)
  ) {
    return false;
  }

  if (typeof candidate.budgetExhausted !== "boolean") return false;
  if (typeof candidate.creativePresent !== "boolean") return false;
  if (typeof candidate.creativeApproved !== "boolean") return false;
  if (typeof candidate.policyBlocked !== "boolean") return false;
  if (typeof candidate.audienceMatched !== "boolean") return false;
  if (!Array.isArray(candidate.targetedCountryCodes)) return false;
  if (!Array.isArray(candidate.targetedLanguageCodes)) return false;

  return true;
}

function normalizeCountryCode(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    return null;
  }
  return normalized;
}

function isValidLanguageTag(value: string): boolean {
  return (
    /^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/.test(value) && value.length <= 16
  );
}

/**
 * Deterministic language match (see AdsEligibilityCandidateState docs).
 * Returns null when targeting/request language data is invalid (fail closed).
 */
export function matchesLanguageTargeting(
  requestLanguageCode: string,
  targetedLanguageCodes: readonly string[]
): boolean | null {
  if (!isNonEmptyString(requestLanguageCode)) {
    return null;
  }
  const requestTag = requestLanguageCode.trim().toLowerCase();
  if (!isValidLanguageTag(requestTag)) {
    return null;
  }

  if (targetedLanguageCodes.length === 0) {
    return true;
  }

  const requestPrimary = requestTag.split("-")[0] ?? requestTag;

  for (const raw of targetedLanguageCodes) {
    if (!isNonEmptyString(raw)) {
      return null;
    }
    const target = raw.trim().toLowerCase();
    if (!isValidLanguageTag(target)) {
      return null;
    }
    if (target === requestTag) {
      return true;
    }
    if (!target.includes("-") && target === requestPrimary) {
      return true;
    }
  }

  return false;
}

/**
 * Country allowlist match. Empty allowlist = unrestricted.
 * Returns null when targeting/request country data is invalid (fail closed).
 */
export function matchesCountryTargeting(
  requestCountryCode: string,
  targetedCountryCodes: readonly string[]
): boolean | null {
  const requestCountry = normalizeCountryCode(requestCountryCode);
  if (!requestCountry) {
    return null;
  }

  if (targetedCountryCodes.length === 0) {
    return true;
  }

  const allowed = new Set<string>();
  for (const raw of targetedCountryCodes) {
    if (!isNonEmptyString(raw)) {
      return null;
    }
    const normalized = normalizeCountryCode(raw);
    if (!normalized) {
      return null;
    }
    allowed.add(normalized);
  }

  return allowed.has(requestCountry);
}

/**
 * Schedule window: [startsAt, endsAt) — start inclusive, end exclusive.
 * endsAt null = open-ended. Returns:
 * - "ok" when inside the window
 * - "not_started" when before start
 * - "expired" when at/after end
 * - "invalid" when timestamps cannot be parsed
 */
export function evaluateScheduleWindow(
  currentTimestamp: string,
  startsAt: string,
  endsAt: string | null
): "ok" | "not_started" | "expired" | "invalid" {
  const nowMs = parseIsoTimestampMs(currentTimestamp);
  const startMs = parseIsoTimestampMs(startsAt);
  if (nowMs === null || startMs === null) {
    return "invalid";
  }

  if (nowMs < startMs) {
    return "not_started";
  }

  if (endsAt === null) {
    return "ok";
  }

  const endMs = parseIsoTimestampMs(endsAt);
  if (endMs === null) {
    return "invalid";
  }

  if (nowMs >= endMs) {
    return "expired";
  }

  return "ok";
}

function isDeliveryEnabled(featureFlags: AdsDeliveryRequest["featureFlags"]): boolean {
  return featureFlags[ADS_ELIGIBILITY_DELIVERY_FLAG_KEY] === true;
}

function isPlacementEnabled(
  placementId: AdsPlatformPlacementId,
  featureFlags: AdsDeliveryRequest["featureFlags"]
): boolean {
  const flagKey = getAdsPlacement(placementId).featureFlag.key;
  return featureFlags[flagKey] === true;
}

/**
 * Deterministic fail-closed eligibility evaluation for one candidate.
 * Does not mutate inputs. Does not select or serve ads.
 */
export function evaluateAdsCandidateEligibility(
  request: AdsDeliveryRequest,
  candidate: AdsEligibilityCandidateState
): AdsCandidateEligibilityDecision {
  const candidateId = isNonEmptyString(candidate?.candidateId)
    ? candidate.candidateId
    : "";

  if (!isRecord(request) || !hasRequiredCandidateShape(candidate)) {
    return Object.freeze({
      contractVersion: ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
      candidateId: candidateId || "unknown",
      eligible: false,
      exclusionReason: "unknown" as const,
      matchedRule: null,
      productionEnabled: false as const,
    });
  }

  // Prefer the candidate's id once shape is validated.
  const id = candidate.candidateId;

  // 1. delivery disabled
  if (!isDeliveryEnabled(request.featureFlags)) {
    return excluded(id, "delivery_disabled", "delivery_disabled");
  }

  // 2. placement disabled
  if (!isAdsPlacementId(request.placementId)) {
    return excluded(id, "unknown", "placement_disabled");
  }
  if (!isPlacementEnabled(request.placementId, request.featureFlags)) {
    return excluded(id, "placement_disabled", "placement_disabled");
  }

  // 3. placement mismatch
  if (candidate.placementId !== request.placementId) {
    return excluded(id, "placement_mismatch", "placement_mismatch");
  }

  // 4. campaign status not active
  if (candidate.campaignStatus !== ADS_ELIGIBILITY_ACTIVE_STATUS) {
    return excluded(id, "campaign_paused", "campaign_status_not_active");
  }

  // 5. ad set status not active
  if (candidate.adSetStatus !== ADS_ELIGIBILITY_ACTIVE_STATUS) {
    return excluded(id, "ad_set_inactive", "ad_set_status_not_active");
  }

  // 6. ad status not active
  if (candidate.adStatus !== ADS_ELIGIBILITY_ACTIVE_STATUS) {
    return excluded(id, "ad_inactive", "ad_status_not_active");
  }

  // 7–8. campaign schedule
  const campaignWindow = evaluateScheduleWindow(
    request.currentTimestamp,
    candidate.campaignStartsAt,
    candidate.campaignEndsAt
  );
  if (campaignWindow === "invalid") {
    return excluded(id, "unknown", "campaign_not_started");
  }
  if (campaignWindow === "not_started") {
    return excluded(id, "campaign_not_started", "campaign_not_started");
  }
  if (campaignWindow === "expired") {
    return excluded(id, "campaign_expired", "campaign_expired");
  }

  // 9–10. ad set schedule
  const adSetWindow = evaluateScheduleWindow(
    request.currentTimestamp,
    candidate.adSetStartsAt,
    candidate.adSetEndsAt
  );
  if (adSetWindow === "invalid") {
    return excluded(id, "unknown", "ad_set_not_started");
  }
  if (adSetWindow === "not_started") {
    return excluded(id, "ad_set_not_started", "ad_set_not_started");
  }
  if (adSetWindow === "expired") {
    return excluded(id, "ad_set_expired", "ad_set_expired");
  }

  // 11. budget exhausted marker
  if (candidate.budgetExhausted === true) {
    return excluded(id, "budget_exhausted", "budget_exhausted");
  }

  // 12. creative missing
  if (candidate.creativePresent !== true) {
    return excluded(id, "creative_missing", "creative_missing");
  }

  // 13. creative not approved
  if (candidate.creativeApproved !== true) {
    return excluded(id, "creative_not_approved", "creative_not_approved");
  }

  // 14. policy blocked
  if (candidate.policyBlocked === true) {
    return excluded(id, "policy_blocked", "policy_blocked");
  }

  // 15. country targeting
  const countryMatch = matchesCountryTargeting(
    request.geo.countryCode,
    candidate.targetedCountryCodes
  );
  if (countryMatch === null) {
    return excluded(id, "unknown", "country_targeting_mismatch");
  }
  if (countryMatch === false) {
    return excluded(id, "geo_mismatch", "country_targeting_mismatch");
  }

  // 16. language targeting
  const languageMatch = matchesLanguageTargeting(
    request.languageCode,
    candidate.targetedLanguageCodes
  );
  if (languageMatch === null) {
    return excluded(id, "unknown", "language_targeting_mismatch");
  }
  if (languageMatch === false) {
    return excluded(id, "language_mismatch", "language_targeting_mismatch");
  }

  // 17. audience mismatch marker
  if (candidate.audienceMatched !== true) {
    return excluded(id, "audience_mismatch", "audience_mismatch");
  }

  // 18. otherwise eligible — still productionEnabled: false
  return eligible(id);
}
