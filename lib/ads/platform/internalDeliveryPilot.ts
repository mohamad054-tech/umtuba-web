import type { ContractValidationResult } from "./creativeContracts";
import {
  validateAdsExecutionResult,
  type AdsExecutionResult,
} from "./executionLayer";
import {
  validateAdsRenderDescriptor,
  type AdsRenderDescriptor,
} from "./renderDescriptor";

/**
 * Ads Internal Delivery Pilot V1 — in-memory completion only.
 *
 * Accepts ONLY a validated AdsExecutionResult (post inventory → eligibility →
 * compatibility → selectable set → pilot selector → serve boundary).
 * Never accepts raw inventory or raw candidates.
 *
 * Success means the internal pipeline completed with a selected candidate and
 * render descriptor metadata. This is NOT production delivery and NEVER:
 * - renders creatives or serves an advertisement externally
 * - enables ADS_DELIVERY_ENABLED or placement flags
 * - imports product surfaces (Watch / Discover / Live / Store / World / …)
 * - imports Supabase, queries a database, touches storage, or uses the network
 * - emits events, bills, auctions, paces, measures, reports, or optimizes
 *
 * deliveryEnabled, productionEnabled, and served are always false.
 */

export const ADS_INTERNAL_DELIVERY_PILOT_CONTRACT_VERSION = "v1" as const;

/**
 * Stable failure reasons when the pilot returns pilotSuccess=false.
 * Hard rejects (malformed / inconsistent / invalid descriptor) return
 * valid:false with issues instead.
 */
export const ADS_INTERNAL_DELIVERY_PILOT_FAILURE_REASONS = [
  "empty_pipeline",
  "missing_selected_candidate",
  "missing_render_descriptor",
] as const;

export type AdsInternalDeliveryPilotFailureReason =
  (typeof ADS_INTERNAL_DELIVERY_PILOT_FAILURE_REASONS)[number];

/**
 * Top-level keys allowed on the pilot input.
 * Unknown fields fail closed.
 */
export const ADS_INTERNAL_DELIVERY_PILOT_INPUT_ALLOWED_FIELDS = [
  "executionResult",
] as const;

/**
 * Top-level keys allowed on AdsInternalDeliveryPilotResult.
 * Unknown fields fail closed.
 */
export const ADS_INTERNAL_DELIVERY_PILOT_RESULT_ALLOWED_FIELDS = [
  "contractVersion",
  "pilotSuccess",
  "selectedCandidateId",
  "renderDescriptor",
  "reason",
  "deliveryEnabled",
  "productionEnabled",
  "served",
] as const;

/**
 * Canonical Internal Delivery Pilot Result V1.
 * Never implies external serve/render/delivery.
 */
export type AdsInternalDeliveryPilotResult = Readonly<{
  contractVersion: typeof ADS_INTERNAL_DELIVERY_PILOT_CONTRACT_VERSION;
  pilotSuccess: boolean;
  selectedCandidateId: string | null;
  renderDescriptor: AdsRenderDescriptor | null;
  /** Null on success; stable failure token when pilotSuccess is false. */
  reason: AdsInternalDeliveryPilotFailureReason | null;
  deliveryEnabled: false;
  productionEnabled: false;
  served: false;
}>;

/**
 * Pilot input — validated execution result only.
 * No inventory / candidates / request / eligibility states.
 */
export type AdsInternalDeliveryPilotInput = Readonly<{
  executionResult: AdsExecutionResult;
}>;

export type AdsInternalDeliveryPilotOutcome =
  | Readonly<{ valid: true; result: AdsInternalDeliveryPilotResult }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

const INPUT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_INTERNAL_DELIVERY_PILOT_INPUT_ALLOWED_FIELDS
);
const RESULT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_INTERNAL_DELIVERY_PILOT_RESULT_ALLOWED_FIELDS
);
const FAILURE_REASON_SET = new Set<string>(
  ADS_INTERNAL_DELIVERY_PILOT_FAILURE_REASONS
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function freezePilotResult(
  result: AdsInternalDeliveryPilotResult
): AdsInternalDeliveryPilotResult {
  return Object.freeze({
    contractVersion: result.contractVersion,
    pilotSuccess: result.pilotSuccess,
    selectedCandidateId: result.selectedCandidateId,
    renderDescriptor: result.renderDescriptor,
    reason: result.reason,
    deliveryEnabled: false as const,
    productionEnabled: false as const,
    served: false as const,
  });
}

function failureResult(
  reason: AdsInternalDeliveryPilotFailureReason,
  selectedCandidateId: string | null = null
): AdsInternalDeliveryPilotResult {
  return freezePilotResult({
    contractVersion: ADS_INTERNAL_DELIVERY_PILOT_CONTRACT_VERSION,
    pilotSuccess: false,
    selectedCandidateId,
    renderDescriptor: null,
    reason,
    deliveryEnabled: false,
    productionEnabled: false,
    served: false,
  });
}

/**
 * Pure shape validator for Internal Delivery Pilot Result V1.
 * Fail-closed — does not deliver, render, or serve ads.
 */
export function validateAdsInternalDeliveryPilotResult(
  input: unknown,
  options: { nowMs?: number } = {}
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([
        "Internal delivery pilot result must be an object.",
      ]),
    };
  }

  const issues: string[] = [];

  for (const key of Object.keys(input)) {
    if (!RESULT_ALLOWED_FIELD_SET.has(key)) {
      issues.push(
        `Internal delivery pilot result contains unknown field "${key}".`
      );
    }
  }

  if (input.contractVersion !== ADS_INTERNAL_DELIVERY_PILOT_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be "${ADS_INTERNAL_DELIVERY_PILOT_CONTRACT_VERSION}".`
    );
  }

  if (typeof input.pilotSuccess !== "boolean") {
    issues.push("pilotSuccess must be a boolean.");
  }

  if (input.deliveryEnabled !== false) {
    issues.push("deliveryEnabled must be false.");
  }
  if (input.productionEnabled !== false) {
    issues.push("productionEnabled must be false.");
  }
  if (input.served !== false) {
    issues.push("served must be false.");
  }

  if (input.pilotSuccess === true) {
    if (input.reason !== null) {
      issues.push("reason must be null when pilotSuccess is true.");
    }
    if (!isNonEmptyString(input.selectedCandidateId)) {
      issues.push(
        "selectedCandidateId is required when pilotSuccess is true."
      );
    }
    if (input.renderDescriptor === null || input.renderDescriptor === undefined) {
      issues.push("renderDescriptor is required when pilotSuccess is true.");
    } else {
      const descriptorValidation = validateAdsRenderDescriptor(
        input.renderDescriptor,
        options.nowMs !== undefined ? { nowMs: options.nowMs } : {}
      );
      if (!descriptorValidation.valid) {
        for (const issue of descriptorValidation.issues) {
          issues.push(`renderDescriptor: ${issue}`);
        }
      }
    }
  } else if (input.pilotSuccess === false) {
    if (
      !isNonEmptyString(input.reason) ||
      !FAILURE_REASON_SET.has(input.reason)
    ) {
      issues.push(
        "reason is required when pilotSuccess is false and must be a supported failure reason."
      );
    }
    if (input.renderDescriptor !== null) {
      issues.push("renderDescriptor must be null when pilotSuccess is false.");
    }
    if (input.served !== false) {
      issues.push("served must be false.");
    }
    if (
      input.selectedCandidateId !== null &&
      !isNonEmptyString(input.selectedCandidateId)
    ) {
      issues.push("selectedCandidateId must be a non-empty string or null.");
    }
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Empty internal pilot result — no selection, not served, delivery off.
 */
export function createEmptyAdsInternalDeliveryPilotResult(): AdsInternalDeliveryPilotResult {
  return failureResult("empty_pipeline");
}

/**
 * Completes the internal delivery pilot from a validated execution result.
 * Fail-closed on malformed / inconsistent execution output. Soft-fails with
 * pilotSuccess=false for empty pipelines or unpaired selection/descriptor.
 * Never renders, serves, enables delivery, or touches network/DB/storage.
 */
export function runInternalDeliveryPilot(
  input: unknown,
  options: { nowMs?: number } = {}
): AdsInternalDeliveryPilotOutcome {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([
        "Internal delivery pilot input must be an object.",
      ]),
    };
  }

  const issues: string[] = [];
  for (const key of Object.keys(input)) {
    if (!INPUT_ALLOWED_FIELD_SET.has(key)) {
      issues.push(
        `Internal delivery pilot input contains unknown field "${key}".`
      );
    }
  }
  if (!("executionResult" in input)) {
    issues.push(
      "Internal delivery pilot input must include executionResult."
    );
  }
  if (issues.length > 0) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  const executionValidation = validateAdsExecutionResult(input.executionResult, {
    ...(options.nowMs !== undefined ? { nowMs: options.nowMs } : {}),
  });
  if (!executionValidation.valid) {
    return {
      valid: false,
      issues: Object.freeze([
        ...executionValidation.issues.map(
          (issue) => `Inconsistent execution result: ${issue}`
        ),
      ]),
    };
  }

  const executionResult = input.executionResult as AdsExecutionResult;

  if (executionResult.productionEnabled !== false) {
    return {
      valid: false,
      issues: Object.freeze(["productionEnabled must be false."]),
    };
  }

  if (executionResult.executionCompleted !== true) {
    return {
      valid: false,
      issues: Object.freeze(["executionCompleted must be true."]),
    };
  }

  const selectedCandidateId = executionResult.selectedCandidateId;
  const renderDescriptor = executionResult.renderDescriptor;

  // Reject descriptor without a selected candidate (fail closed).
  if (selectedCandidateId === null && renderDescriptor !== null) {
    return {
      valid: false,
      issues: Object.freeze([
        "renderDescriptor must be null when selectedCandidateId is null.",
      ]),
    };
  }

  if (selectedCandidateId === null || renderDescriptor === null) {
    const result = failureResult(
      selectedCandidateId === null
        ? "empty_pipeline"
        : "missing_render_descriptor",
      selectedCandidateId
    );
    const validation = validateAdsInternalDeliveryPilotResult(result, options);
    if (!validation.valid) {
      return { valid: false, issues: Object.freeze([...validation.issues]) };
    }
    return { valid: true, result };
  }

  // selectedCandidateId and renderDescriptor are both present and paired.
  const descriptorValidation = validateAdsRenderDescriptor(renderDescriptor, {
    ...(options.nowMs !== undefined ? { nowMs: options.nowMs } : {}),
  });
  if (!descriptorValidation.valid) {
    return {
      valid: false,
      issues: Object.freeze([
        ...descriptorValidation.issues.map(
          (issue) => `Invalid render descriptor: ${issue}`
        ),
      ]),
    };
  }

  if (renderDescriptor.productionEnabled !== false) {
    return {
      valid: false,
      issues: Object.freeze([
        "renderDescriptor.productionEnabled must be false.",
      ]),
    };
  }

  const result = freezePilotResult({
    contractVersion: ADS_INTERNAL_DELIVERY_PILOT_CONTRACT_VERSION,
    pilotSuccess: true,
    selectedCandidateId,
    renderDescriptor,
    reason: null,
    deliveryEnabled: false,
    productionEnabled: false,
    served: false,
  });

  const resultValidation = validateAdsInternalDeliveryPilotResult(
    result,
    options
  );
  if (!resultValidation.valid) {
    return {
      valid: false,
      issues: Object.freeze([...resultValidation.issues]),
    };
  }

  return { valid: true, result };
}
