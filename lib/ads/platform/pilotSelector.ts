import type { ContractValidationResult } from "./creativeContracts";
import { ADS_DELIVERY_MAX_ID_LENGTH } from "./deliveryContracts";
import {
  validateAdsSelectableSet,
  type AdsSelectableSet,
} from "./selectableSet";

/**
 * Ads Deterministic Pilot Selector V1 — pure in-memory selection only.
 *
 * Accepts ONLY the canonical post-gate selectable set
 * (eligibility ∩ creative↔placement compatibility). Never accepts inventory,
 * eligibility states, compatibility results, or delivery request candidates.
 *
 * Strategy V1: first candidate in preserved selectable order.
 * Empty selectable set → selectedCandidateId null.
 *
 * This module never:
 * - ranks, scores, weights, randomizes, auctions, or paces
 * - enables ADS_DELIVERY_ENABLED or placement flags
 * - renders, serves, or builds a render descriptor
 * - imports Supabase or product modules
 * - consults wall-clock or nondeterministic entropy sources
 *
 * productionEnabled and deliveryEnabled are always false.
 */

export const ADS_PILOT_SELECTOR_CONTRACT_VERSION = "v1" as const;

/** Sole supported V1 strategy — first entry in selectable order. */
export const ADS_PILOT_SELECTOR_STRATEGY = "first_selectable" as const;

export const ADS_PILOT_SELECTION_REASONS = [
  "first_selectable",
  "empty_selectable_set",
] as const;

export type AdsPilotSelectionReason =
  (typeof ADS_PILOT_SELECTION_REASONS)[number];

/**
 * Top-level keys allowed on AdsPilotSelectorResult.
 * Unknown fields fail closed.
 */
export const ADS_PILOT_SELECTOR_RESULT_ALLOWED_FIELDS = [
  "selectorVersion",
  "selectionStrategy",
  "selectableCandidateCount",
  "selectedCandidateId",
  "selectionReason",
  "productionEnabled",
  "deliveryEnabled",
] as const;

/**
 * Canonical Pilot Selector Result V1.
 * selectedCandidateId is an internal pilot choice only — never a serve/render.
 */
export type AdsPilotSelectorResult = Readonly<{
  selectorVersion: typeof ADS_PILOT_SELECTOR_CONTRACT_VERSION;
  selectionStrategy: typeof ADS_PILOT_SELECTOR_STRATEGY;
  selectableCandidateCount: number;
  selectedCandidateId: string | null;
  selectionReason: AdsPilotSelectionReason;
  productionEnabled: false;
  deliveryEnabled: false;
}>;

/**
 * Selector input — canonical selectable set only.
 * No inventory / eligibility / compatibility / request candidates.
 */
export type AdsPilotSelectorInput = Readonly<{
  selectableSet: AdsSelectableSet;
}>;

export type AdsPilotSelectorOutcome =
  | Readonly<{ valid: true; result: AdsPilotSelectorResult }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

/**
 * Optional cross-check context for selection summary / rejection consistency.
 */
export type AdsPilotSelectionConsistencyContext = Readonly<{
  eligibleCandidateIds: readonly string[];
  rejectedCandidateIds: readonly string[];
}>;

const RESULT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_PILOT_SELECTOR_RESULT_ALLOWED_FIELDS
);

const REASON_SET = new Set<string>(ADS_PILOT_SELECTION_REASONS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function freezePilotSelectorResult(
  result: AdsPilotSelectorResult
): AdsPilotSelectorResult {
  return Object.freeze({
    selectorVersion: result.selectorVersion,
    selectionStrategy: result.selectionStrategy,
    selectableCandidateCount: result.selectableCandidateCount,
    selectedCandidateId: result.selectedCandidateId,
    selectionReason: result.selectionReason,
    productionEnabled: false as const,
    deliveryEnabled: false as const,
  });
}

/**
 * Pure shape validator for Pilot Selector Result V1.
 * Fail-closed — does not select or deliver ads.
 */
export function validateAdsPilotSelectorResult(
  input: unknown
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Pilot selector result must be an object."]),
    };
  }

  const issues: string[] = [];

  for (const key of Object.keys(input)) {
    if (!RESULT_ALLOWED_FIELD_SET.has(key)) {
      issues.push(`Pilot selector result contains unknown field "${key}".`);
    }
  }

  if (input.selectorVersion !== ADS_PILOT_SELECTOR_CONTRACT_VERSION) {
    issues.push(
      `selectorVersion must be "${ADS_PILOT_SELECTOR_CONTRACT_VERSION}".`
    );
  }

  if (input.selectionStrategy !== ADS_PILOT_SELECTOR_STRATEGY) {
    issues.push(
      `selectionStrategy must be "${ADS_PILOT_SELECTOR_STRATEGY}".`
    );
  }

  if (input.productionEnabled !== false) {
    issues.push("productionEnabled must be false.");
  }

  if (input.deliveryEnabled !== false) {
    issues.push("deliveryEnabled must be false.");
  }

  if (!isNonNegativeInteger(input.selectableCandidateCount)) {
    issues.push("selectableCandidateCount must be a non-negative integer.");
  }

  if (!isNonEmptyString(input.selectionReason) || !REASON_SET.has(input.selectionReason)) {
    issues.push("selectionReason is not a supported pilot selection reason.");
  }

  if (input.selectedCandidateId === null) {
    if (input.selectionReason === "first_selectable") {
      issues.push(
        'selectionReason must be "empty_selectable_set" when selectedCandidateId is null.'
      );
    }
    if (
      isNonNegativeInteger(input.selectableCandidateCount) &&
      input.selectableCandidateCount > 0 &&
      input.selectionReason === "empty_selectable_set"
    ) {
      issues.push(
        "empty_selectable_set reason requires selectableCandidateCount to be 0."
      );
    }
  } else if (!isNonEmptyString(input.selectedCandidateId)) {
    issues.push(
      "selectedCandidateId must be a non-empty string or null."
    );
  } else {
    if (input.selectedCandidateId.length > ADS_DELIVERY_MAX_ID_LENGTH) {
      issues.push(
        `selectedCandidateId exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
      );
    }
    if (input.selectionReason !== "first_selectable") {
      issues.push(
        'selectionReason must be "first_selectable" when a candidate is selected.'
      );
    }
    if (
      isNonNegativeInteger(input.selectableCandidateCount) &&
      input.selectableCandidateCount < 1
    ) {
      issues.push(
        "selectedCandidateId requires selectableCandidateCount to be greater than 0."
      );
    }
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Fail-closed consistency checks against selectable membership, eligible
 * summary ids, and rejected ids. Does not select or deliver.
 */
export function validateAdsPilotSelectionConsistency(
  result: AdsPilotSelectorResult,
  selectableSet: AdsSelectableSet,
  context: AdsPilotSelectionConsistencyContext
): ContractValidationResult {
  const issues: string[] = [];

  if (result.selectableCandidateCount !== selectableSet.selectableCandidates.length) {
    issues.push(
      "selectableCandidateCount is inconsistent with selectableCandidates length."
    );
  }

  const selectableIds = selectableSet.selectableCandidates.map(
    (entry) => entry.candidateId
  );
  const selectableIdSet = new Set(selectableIds);
  if (selectableIdSet.size !== selectableIds.length) {
    issues.push("selectableCandidates contain duplicate candidateId values.");
  }

  if (result.selectedCandidateId !== null) {
    if (!selectableIdSet.has(result.selectedCandidateId)) {
      issues.push(
        `selectedCandidateId "${result.selectedCandidateId}" is outside the selectable set.`
      );
    } else if (selectableIds[0] !== result.selectedCandidateId) {
      issues.push(
        `selectedCandidateId "${result.selectedCandidateId}" is inconsistent with first_selectable strategy.`
      );
    }

    if (!context.eligibleCandidateIds.includes(result.selectedCandidateId)) {
      issues.push(
        `selectedCandidateId "${result.selectedCandidateId}" is missing from selectionSummary.eligibleCandidates.`
      );
    }

    if (context.rejectedCandidateIds.includes(result.selectedCandidateId)) {
      issues.push(
        `selectedCandidateId "${result.selectedCandidateId}" must not appear in rejectedCandidates.`
      );
    }
  } else if (selectableIds.length > 0) {
    issues.push(
      "selectedCandidateId is null despite a non-empty selectable set."
    );
  }

  // Selection summary eligible list must match selectable set (order + membership).
  if (
    context.eligibleCandidateIds.length !== selectableIds.length ||
    context.eligibleCandidateIds.some((id, index) => id !== selectableIds[index])
  ) {
    issues.push(
      "selectionSummary.eligibleCandidates mismatch against selectable set."
    );
  }

  for (const id of context.rejectedCandidateIds) {
    if (selectableIdSet.has(id)) {
      issues.push(
        `rejectedCandidates include selectable candidateId "${id}".`
      );
    }
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Runs the deterministic first-selectable pilot selector.
 * Input must be the canonical selectable set only.
 */
export function runAdsPilotSelector(
  input: unknown
): AdsPilotSelectorOutcome {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Pilot selector input must be an object."]),
    };
  }

  for (const key of Object.keys(input)) {
    if (key !== "selectableSet") {
      return {
        valid: false,
        issues: Object.freeze([
          `Pilot selector input contains unknown field "${key}".`,
        ]),
      };
    }
  }

  if (!("selectableSet" in input)) {
    return {
      valid: false,
      issues: Object.freeze([
        "Pilot selector input must include selectableSet.",
      ]),
    };
  }

  const setValidation = validateAdsSelectableSet(input.selectableSet);
  if (!setValidation.valid) {
    return {
      valid: false,
      issues: Object.freeze([
        ...setValidation.issues.map(
          (issue) => `Malformed selectable set: ${issue}`
        ),
      ]),
    };
  }

  const selectableSet = input.selectableSet as AdsSelectableSet;
  const selectableIds = selectableSet.selectableCandidates.map(
    (entry) => entry.candidateId
  );
  const seen = new Set<string>();
  for (const id of selectableIds) {
    if (seen.has(id)) {
      return {
        valid: false,
        issues: Object.freeze([
          `selectableCandidates contain duplicate candidateId "${id}".`,
        ]),
      };
    }
    seen.add(id);
  }

  const first = selectableSet.selectableCandidates[0];
  const result = freezePilotSelectorResult({
    selectorVersion: ADS_PILOT_SELECTOR_CONTRACT_VERSION,
    selectionStrategy: ADS_PILOT_SELECTOR_STRATEGY,
    selectableCandidateCount: selectableSet.selectableCandidates.length,
    selectedCandidateId: first ? first.candidateId : null,
    selectionReason: first ? "first_selectable" : "empty_selectable_set",
    productionEnabled: false,
    deliveryEnabled: false,
  });

  const resultValidation = validateAdsPilotSelectorResult(result);
  if (!resultValidation.valid) {
    return {
      valid: false,
      issues: Object.freeze([...resultValidation.issues]),
    };
  }

  return { valid: true, result };
}

/**
 * Empty pilot selection — no selectable candidates, production/delivery off.
 */
export function createEmptyAdsPilotSelectorResult(): AdsPilotSelectorResult {
  return freezePilotSelectorResult({
    selectorVersion: ADS_PILOT_SELECTOR_CONTRACT_VERSION,
    selectionStrategy: ADS_PILOT_SELECTOR_STRATEGY,
    selectableCandidateCount: 0,
    selectedCandidateId: null,
    selectionReason: "empty_selectable_set",
    productionEnabled: false,
    deliveryEnabled: false,
  });
}

/**
 * Privacy-safe selection diagnostic token for decision-trace summaries.
 * Primitive string only — never viewer/session/PII/URLs/raw objects.
 */
export function resolvePilotSelectionTraceOutcome(options: {
  candidateId: string;
  selectedCandidateId: string | null;
  selectableCandidateIds: readonly string[];
}): "selected_first_selectable" | "not_selected_earlier_selectable" | "not_selectable_earlier_gate" {
  const { candidateId, selectedCandidateId, selectableCandidateIds } = options;
  if (selectedCandidateId !== null && candidateId === selectedCandidateId) {
    return "selected_first_selectable";
  }
  if (selectableCandidateIds.includes(candidateId)) {
    return "not_selected_earlier_selectable";
  }
  return "not_selectable_earlier_gate";
}
