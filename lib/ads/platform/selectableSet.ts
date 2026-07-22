import type { ContractValidationResult } from "./creativeContracts";
import { ADS_DELIVERY_MAX_ID_LENGTH } from "./deliveryContracts";
import type { AdsDeliveryCandidateReference } from "./deliveryEligibilityContracts";
import type { AdsCandidateEligibilityDecision } from "./eligibilityRules";

/**
 * Ads Post-Gate Selectable Set & Pilot Selection Boundary V1.
 *
 * Authoritative selectable definition:
 *   Selectable = Eligibility AND Creative Placement Compatibility
 *
 * Nothing else may be considered selectable. This module never:
 * - ranks, scores, auctions, paces, or chooses an advertisement
 * - enables ADS_DELIVERY_ENABLED or placement flags
 * - imports Supabase or product modules
 * - delivers or renders ads
 *
 * Pilot selection boundary: selectedCandidateId is always null in V1.
 * productionEnabled is always false.
 */

export const ADS_SELECTABLE_SET_CONTRACT_VERSION = "v1" as const;

/**
 * Top-level keys allowed on AdsSelectableSet.
 * Unknown fields fail closed.
 */
export const ADS_SELECTABLE_SET_ALLOWED_FIELDS = [
  "contractVersion",
  "evaluatedCandidateCount",
  "selectableCandidates",
  "selectedCandidateId",
  "productionEnabled",
] as const;

/**
 * Compatibility outcome required to build the selectable intersection.
 * Intentionally minimal — only candidateId + compatible flag.
 */
export type AdsSelectableCompatibilityDecision = Readonly<{
  candidateId: string;
  compatible: boolean;
}>;

/**
 * Canonical Post-Gate Selectable Set V1.
 * selectedCandidateId is always null until a future selector exists.
 */
export type AdsSelectableSet = Readonly<{
  contractVersion: typeof ADS_SELECTABLE_SET_CONTRACT_VERSION;
  evaluatedCandidateCount: number;
  /** Inventory / evaluation order; eligibility ∩ compatibility only. */
  selectableCandidates: readonly AdsDeliveryCandidateReference[];
  /** Pilot selection boundary — always null in V1 (no selector yet). */
  selectedCandidateId: null;
  productionEnabled: false;
}>;

/**
 * Build input — eligibility + compatibility decisions already produced upstream.
 * Arrays must align 1:1 by candidateId and order.
 */
export type AdsSelectableSetInput = Readonly<{
  eligibilityResults: readonly AdsCandidateEligibilityDecision[];
  compatibilityResults: readonly AdsSelectableCompatibilityDecision[];
}>;

export type AdsSelectableSetBuildOutcome =
  | Readonly<{ valid: true; selectableSet: AdsSelectableSet }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

const ALLOWED_FIELD_SET = new Set<string>(ADS_SELECTABLE_SET_ALLOWED_FIELDS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function freezeSelectableSet(set: AdsSelectableSet): AdsSelectableSet {
  return Object.freeze({
    contractVersion: set.contractVersion,
    evaluatedCandidateCount: set.evaluatedCandidateCount,
    selectableCandidates: Object.freeze(
      set.selectableCandidates.map((entry) => Object.freeze({ ...entry }))
    ),
    selectedCandidateId: null,
    productionEnabled: false as const,
  });
}

function collectDuplicateIds(
  ids: readonly string[],
  label: string,
  issues: string[]
): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      issues.push(`${label} contain duplicate candidateId "${id}".`);
    } else {
      seen.add(id);
    }
  }
}

function validateBuildInput(input: AdsSelectableSetInput): string[] {
  const issues: string[] = [];

  if (!isRecord(input)) {
    return ["Selectable set input must be an object."];
  }

  if (!Array.isArray(input.eligibilityResults)) {
    issues.push("eligibilityResults must be an array.");
  }
  if (!Array.isArray(input.compatibilityResults)) {
    issues.push("compatibilityResults must be an array.");
  }
  if (
    !Array.isArray(input.eligibilityResults) ||
    !Array.isArray(input.compatibilityResults)
  ) {
    return issues;
  }

  if (input.eligibilityResults.length !== input.compatibilityResults.length) {
    issues.push(
      "compatibilityResults length is inconsistent with eligibilityResults length."
    );
  }

  const eligibilityIds: string[] = [];
  for (let i = 0; i < input.eligibilityResults.length; i++) {
    const decision = input.eligibilityResults[i];
    const prefix = `eligibilityResults[${i}]`;
    if (!isRecord(decision)) {
      issues.push(`${prefix} must be an object.`);
      continue;
    }
    if (!isNonEmptyString(decision.candidateId)) {
      issues.push(
        `${prefix}.candidateId is required and must be a non-empty string.`
      );
    } else if (decision.candidateId.length > ADS_DELIVERY_MAX_ID_LENGTH) {
      issues.push(
        `${prefix}.candidateId exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
      );
    } else {
      eligibilityIds.push(decision.candidateId);
    }
    if (typeof decision.eligible !== "boolean") {
      issues.push(`${prefix}.eligible must be a boolean.`);
    }
  }

  const compatibilityIds: string[] = [];
  for (let i = 0; i < input.compatibilityResults.length; i++) {
    const decision = input.compatibilityResults[i];
    const prefix = `compatibilityResults[${i}]`;
    if (!isRecord(decision)) {
      issues.push(`${prefix} must be an object.`);
      continue;
    }
    if (!isNonEmptyString(decision.candidateId)) {
      issues.push(
        `${prefix}.candidateId is required and must be a non-empty string.`
      );
    } else if (decision.candidateId.length > ADS_DELIVERY_MAX_ID_LENGTH) {
      issues.push(
        `${prefix}.candidateId exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
      );
    } else {
      compatibilityIds.push(decision.candidateId);
    }
    if (typeof decision.compatible !== "boolean") {
      issues.push(`${prefix}.compatible must be a boolean.`);
    }
  }

  collectDuplicateIds(eligibilityIds, "eligibilityResults", issues);
  collectDuplicateIds(compatibilityIds, "compatibilityResults", issues);

  const maxLen = Math.max(eligibilityIds.length, compatibilityIds.length);
  for (let i = 0; i < maxLen; i++) {
    const eligibilityId = eligibilityIds[i];
    const compatibilityId = compatibilityIds[i];
    if (
      eligibilityId !== undefined &&
      compatibilityId !== undefined &&
      eligibilityId !== compatibilityId
    ) {
      issues.push(
        `compatibilityResults[${i}].candidateId "${compatibilityId}" is inconsistent with eligibilityResults[${i}].candidateId "${eligibilityId}".`
      );
    }
  }

  return issues;
}

/**
 * Pure shape + invariant validator for Selectable Set V1.
 * Fail-closed — does not select or deliver ads.
 */
export function validateAdsSelectableSet(
  input: unknown
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Selectable set must be an object."]),
    };
  }

  const issues: string[] = [];

  for (const key of Object.keys(input)) {
    if (!ALLOWED_FIELD_SET.has(key)) {
      issues.push(`Selectable set contains unknown field "${key}".`);
    }
  }

  if (input.contractVersion !== ADS_SELECTABLE_SET_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be "${ADS_SELECTABLE_SET_CONTRACT_VERSION}".`
    );
  }

  if (input.productionEnabled !== false) {
    issues.push("productionEnabled must be false.");
  }

  if (input.selectedCandidateId !== null) {
    issues.push("selectedCandidateId must be null.");
  }

  if (!isNonNegativeInteger(input.evaluatedCandidateCount)) {
    issues.push("evaluatedCandidateCount must be a non-negative integer.");
  }

  if (!Array.isArray(input.selectableCandidates)) {
    issues.push("selectableCandidates must be an array.");
  } else {
    if (
      isNonNegativeInteger(input.evaluatedCandidateCount) &&
      input.selectableCandidates.length > input.evaluatedCandidateCount
    ) {
      issues.push(
        "selectableCandidates length cannot exceed evaluatedCandidateCount."
      );
    }

    const seenIds = new Set<string>();
    input.selectableCandidates.forEach((entry, index) => {
      const prefix = `selectableCandidates[${index}]`;
      if (!isRecord(entry)) {
        issues.push(`${prefix} must be an object.`);
        return;
      }
      for (const key of Object.keys(entry)) {
        if (key !== "candidateId") {
          issues.push(`${prefix} contains unknown field "${key}".`);
        }
      }
      if (!isNonEmptyString(entry.candidateId)) {
        issues.push(
          `${prefix}.candidateId is required and must be a non-empty string.`
        );
        return;
      }
      if (entry.candidateId.length > ADS_DELIVERY_MAX_ID_LENGTH) {
        issues.push(
          `${prefix}.candidateId exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
        );
      }
      if (seenIds.has(entry.candidateId)) {
        issues.push(
          `selectableCandidates contain duplicate candidateId "${entry.candidateId}".`
        );
      } else {
        seenIds.add(entry.candidateId);
      }
    });
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Cross-check that a selection summary's eligible list matches the
 * authoritative selectable set (same ids, same order).
 * Fail-closed on any disagreement.
 */
export function validateSelectableSetSelectionConsistency(
  selectableSet: AdsSelectableSet,
  eligibleCandidateIds: readonly string[]
): ContractValidationResult {
  const issues: string[] = [];

  if (!Array.isArray(eligibleCandidateIds)) {
    return {
      valid: false,
      issues: Object.freeze([
        "eligibleCandidateIds must be an array for selectable-set consistency.",
      ]),
    };
  }

  if (eligibleCandidateIds.length !== selectableSet.selectableCandidates.length) {
    issues.push(
      "selection eligibleCandidates length is inconsistent with selectableCandidates length."
    );
  }

  const maxLen = Math.max(
    eligibleCandidateIds.length,
    selectableSet.selectableCandidates.length
  );
  for (let i = 0; i < maxLen; i++) {
    const selectableId = selectableSet.selectableCandidates[i]?.candidateId;
    const eligibleId = eligibleCandidateIds[i];
    if (selectableId !== eligibleId) {
      issues.push(
        `selection eligibleCandidates[${i}] "${String(eligibleId)}" is inconsistent with selectableCandidates[${i}] "${String(selectableId)}".`
      );
    }
  }

  const selectableIdSet = new Set(
    selectableSet.selectableCandidates.map((c) => c.candidateId)
  );
  for (const id of eligibleCandidateIds) {
    if (!selectableIdSet.has(id)) {
      issues.push(
        `selection eligibleCandidates include candidateId "${id}" outside the selectable set.`
      );
    }
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Validates pilot selection boundary against the selectable set.
 * V1: selectedCandidateId must be null. Non-null values outside the set fail.
 */
export function validatePilotSelectionBoundary(
  selectableSet: AdsSelectableSet,
  selectedCandidateId: unknown
): ContractValidationResult {
  const issues: string[] = [];

  if (selectableSet.selectedCandidateId !== null) {
    issues.push("selectable set selectedCandidateId must be null.");
  }

  if (selectedCandidateId !== null) {
    issues.push(
      "selectedCandidateId must be null (pilot selection boundary; no selector yet)."
    );
    if (isNonEmptyString(selectedCandidateId)) {
      const inSet = selectableSet.selectableCandidates.some(
        (c) => c.candidateId === selectedCandidateId
      );
      if (!inSet) {
        issues.push(
          `selectedCandidateId "${selectedCandidateId}" is outside the selectable set.`
        );
      }
    } else if (selectedCandidateId !== null) {
      issues.push("selectedCandidateId is malformed.");
    }
  }

  if (selectableSet.productionEnabled !== false) {
    issues.push("selectable set productionEnabled must be false.");
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Builds the authoritative selectable set = eligibility ∩ compatibility.
 * Preserves evaluation order. Never selects an advertisement.
 */
export function buildAdsSelectableSet(
  input: AdsSelectableSetInput
): AdsSelectableSetBuildOutcome {
  const inputIssues = validateBuildInput(input);
  if (inputIssues.length > 0) {
    return { valid: false, issues: Object.freeze([...inputIssues]) };
  }

  const selectableCandidates: AdsDeliveryCandidateReference[] = [];
  const issues: string[] = [];

  for (let i = 0; i < input.eligibilityResults.length; i++) {
    const eligibility = input.eligibilityResults[i];
    const compatibility = input.compatibilityResults[i];

    if (!eligibility || !compatibility) {
      issues.push(
        `Malformed boundary: missing aligned eligibility/compatibility at index ${i}.`
      );
      continue;
    }

    if (eligibility.eligible && compatibility.compatible) {
      selectableCandidates.push(
        Object.freeze({ candidateId: eligibility.candidateId })
      );
      continue;
    }

    // Invariant: a compatibility-rejected candidate must never enter the set.
    if (!compatibility.compatible && eligibility.eligible) {
      // Correctly excluded — nothing to add.
      continue;
    }
  }

  // Fail closed if any selectable entry somehow conflicts with compatibility.
  for (const entry of selectableCandidates) {
    const compatibility = input.compatibilityResults.find(
      (c) => c.candidateId === entry.candidateId
    );
    if (!compatibility || !compatibility.compatible) {
      issues.push(
        `compatibility-rejected candidate "${entry.candidateId}" must not appear in selectableCandidates.`
      );
    }
    const eligibility = input.eligibilityResults.find(
      (e) => e.candidateId === entry.candidateId
    );
    if (!eligibility || !eligibility.eligible) {
      issues.push(
        `ineligible candidate "${entry.candidateId}" must not appear in selectableCandidates.`
      );
    }
  }

  if (issues.length > 0) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  const selectableSet = freezeSelectableSet({
    contractVersion: ADS_SELECTABLE_SET_CONTRACT_VERSION,
    evaluatedCandidateCount: input.eligibilityResults.length,
    selectableCandidates: Object.freeze(selectableCandidates),
    selectedCandidateId: null,
    productionEnabled: false,
  });

  const validation = validateAdsSelectableSet(selectableSet);
  if (!validation.valid) {
    return { valid: false, issues: Object.freeze([...validation.issues]) };
  }

  const boundary = validatePilotSelectionBoundary(selectableSet, null);
  if (!boundary.valid) {
    return { valid: false, issues: Object.freeze([...boundary.issues]) };
  }

  return { valid: true, selectableSet };
}

/**
 * Empty selectable set — no candidates evaluated, no selection, production off.
 */
export function createEmptyAdsSelectableSet(
  evaluatedCandidateCount = 0
): AdsSelectableSet {
  return freezeSelectableSet({
    contractVersion: ADS_SELECTABLE_SET_CONTRACT_VERSION,
    evaluatedCandidateCount,
    selectableCandidates: Object.freeze([]),
    selectedCandidateId: null,
    productionEnabled: false,
  });
}
