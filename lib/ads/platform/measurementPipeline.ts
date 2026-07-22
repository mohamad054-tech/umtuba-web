import type { ContractValidationResult } from "./creativeContracts";
import {
  ADS_MEASUREMENT_FOUNDATION_CONTRACT_VERSION,
  ADS_MEASUREMENT_FOUNDATION_SIGNATURE_PLACEHOLDER,
  ADS_MEASUREMENT_FOUNDATION_TRUST_LEVEL,
  validateAdsMeasurementFoundationPackage,
  type AdsMeasurementFoundationPackage,
} from "./measurementFoundation";

/**
 * Ads Measurement Pipeline V1 — internal package processing only.
 *
 * Accepts ONLY a validated Measurement Foundation package. Runs a fixed
 * in-memory pipeline:
 *   Validate → Normalize → Deduplicate → Pipeline Result
 *
 * Prepares a normalized package for a future sink. This layer NEVER:
 * - stores, appends, writes, or transmits events
 * - queries a database or imports Supabase
 * - uses the network
 * - enables ADS_DELIVERY_ENABLED, placement flags, or runtime measurement
 * - implements analytics, reporting, billing, attribution, or optimization
 * - imports product surfaces
 *
 * productionEnabled and measurementEnabled are always false.
 * measurementAccepted means the package passed the pipeline — not that
 * measurement is live or that anything was stored/sent.
 */

export const ADS_MEASUREMENT_PIPELINE_CONTRACT_VERSION = "v1" as const;

/** Fixed pipeline stages in evaluation order. */
export const ADS_MEASUREMENT_PIPELINE_STAGES = [
  "validate",
  "normalize",
  "deduplicate",
  "result",
] as const;

export type AdsMeasurementPipelineStage =
  (typeof ADS_MEASUREMENT_PIPELINE_STAGES)[number];

/**
 * Top-level keys allowed on the pipeline input.
 * Unknown fields fail closed.
 */
export const ADS_MEASUREMENT_PIPELINE_INPUT_ALLOWED_FIELDS = [
  "measurementPackage",
  "seenDedupeKeys",
] as const;

/**
 * Top-level keys allowed on AdsMeasurementPipelineResult.
 * Unknown fields fail closed.
 */
export const ADS_MEASUREMENT_PIPELINE_RESULT_ALLOWED_FIELDS = [
  "contractVersion",
  "measurementAccepted",
  "measurementRejected",
  "normalizedPackage",
  "pipelineStage",
  "productionEnabled",
  "measurementEnabled",
] as const;

/**
 * Canonical Measurement Pipeline Result V1.
 * In-memory only — never stored, sent, or reported.
 */
export type AdsMeasurementPipelineResult = Readonly<{
  contractVersion: typeof ADS_MEASUREMENT_PIPELINE_CONTRACT_VERSION;
  measurementAccepted: boolean;
  measurementRejected: boolean;
  normalizedPackage: AdsMeasurementFoundationPackage | null;
  pipelineStage: AdsMeasurementPipelineStage;
  productionEnabled: false;
  measurementEnabled: false;
}>;

/**
 * Pipeline input — validated Measurement Foundation package only.
 * Optional seenDedupeKeys enables fail-closed in-memory duplicate rejection
 * without storage (caller supplies prior keys for the current evaluation).
 */
export type AdsMeasurementPipelineInput = Readonly<{
  measurementPackage: AdsMeasurementFoundationPackage;
  seenDedupeKeys?: readonly string[];
}>;

export type AdsMeasurementPipelineOutcome =
  | Readonly<{ valid: true; result: AdsMeasurementPipelineResult }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

const INPUT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_MEASUREMENT_PIPELINE_INPUT_ALLOWED_FIELDS
);
const RESULT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_MEASUREMENT_PIPELINE_RESULT_ALLOWED_FIELDS
);
const STAGE_SET = new Set<string>(ADS_MEASUREMENT_PIPELINE_STAGES);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function freezePipelineResult(
  result: AdsMeasurementPipelineResult
): AdsMeasurementPipelineResult {
  return Object.freeze({
    contractVersion: ADS_MEASUREMENT_PIPELINE_CONTRACT_VERSION,
    measurementAccepted: result.measurementAccepted,
    measurementRejected: result.measurementRejected,
    normalizedPackage: result.normalizedPackage,
    pipelineStage: result.pipelineStage,
    productionEnabled: false as const,
    measurementEnabled: false as const,
  });
}

function rejectedResult(
  pipelineStage: AdsMeasurementPipelineStage
): AdsMeasurementPipelineResult {
  return freezePipelineResult({
    contractVersion: ADS_MEASUREMENT_PIPELINE_CONTRACT_VERSION,
    measurementAccepted: false,
    measurementRejected: true,
    normalizedPackage: null,
    pipelineStage,
    productionEnabled: false,
    measurementEnabled: false,
  });
}

function acceptedResult(
  normalizedPackage: AdsMeasurementFoundationPackage
): AdsMeasurementPipelineResult {
  return freezePipelineResult({
    contractVersion: ADS_MEASUREMENT_PIPELINE_CONTRACT_VERSION,
    measurementAccepted: true,
    measurementRejected: false,
    normalizedPackage,
    pipelineStage: "result",
    productionEnabled: false,
    measurementEnabled: false,
  });
}

/**
 * Deterministic normalize — rebuilds a frozen package with canonical constants.
 * Never mutates the input package. Never stores or transmits.
 */
export function normalizeAdsMeasurementPackage(
  pkg: AdsMeasurementFoundationPackage
): AdsMeasurementFoundationPackage {
  return Object.freeze({
    contractVersion: ADS_MEASUREMENT_FOUNDATION_CONTRACT_VERSION,
    measurementReady: true as const,
    eventType: pkg.eventType,
    dedupeKey: pkg.dedupeKey,
    trustLevel: ADS_MEASUREMENT_FOUNDATION_TRUST_LEVEL,
    signaturePlaceholder: ADS_MEASUREMENT_FOUNDATION_SIGNATURE_PLACEHOLDER,
    productionEnabled: false as const,
    measurementEnabled: false as const,
  });
}

/**
 * Pure shape validator for Measurement Pipeline Result V1.
 * Fail-closed — does not store, send, or enable measurement.
 */
export function validateAdsMeasurementPipelineResult(
  input: unknown
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([
        "Measurement pipeline result must be an object.",
      ]),
    };
  }

  const issues: string[] = [];

  for (const key of Object.keys(input)) {
    if (!RESULT_ALLOWED_FIELD_SET.has(key)) {
      issues.push(
        `Measurement pipeline result contains unknown field "${key}".`
      );
    }
  }

  if (input.contractVersion !== ADS_MEASUREMENT_PIPELINE_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be "${ADS_MEASUREMENT_PIPELINE_CONTRACT_VERSION}".`
    );
  }

  if (typeof input.measurementAccepted !== "boolean") {
    issues.push("measurementAccepted must be a boolean.");
  }
  if (typeof input.measurementRejected !== "boolean") {
    issues.push("measurementRejected must be a boolean.");
  }

  if (
    typeof input.measurementAccepted === "boolean" &&
    typeof input.measurementRejected === "boolean"
  ) {
    if (input.measurementAccepted === input.measurementRejected) {
      issues.push(
        "measurementAccepted and measurementRejected must be mutually exclusive."
      );
    }
  }

  if (
    typeof input.pipelineStage !== "string" ||
    !STAGE_SET.has(input.pipelineStage)
  ) {
    issues.push(
      `pipelineStage must be one of: ${ADS_MEASUREMENT_PIPELINE_STAGES.join(", ")}.`
    );
  }

  if (input.productionEnabled !== false) {
    issues.push("productionEnabled must be false.");
  }
  if (input.measurementEnabled !== false) {
    issues.push("measurementEnabled must be false.");
  }

  if (input.measurementAccepted === true) {
    if (input.pipelineStage !== "result") {
      issues.push('pipelineStage must be "result" when measurementAccepted is true.');
    }
    if (input.normalizedPackage === null || input.normalizedPackage === undefined) {
      issues.push(
        "normalizedPackage is required when measurementAccepted is true."
      );
    } else {
      const packageValidation = validateAdsMeasurementFoundationPackage(
        input.normalizedPackage
      );
      if (!packageValidation.valid) {
        for (const issue of packageValidation.issues) {
          issues.push(`normalizedPackage: ${issue}`);
        }
      }
    }
  } else if (input.measurementRejected === true) {
    if (input.normalizedPackage !== null) {
      issues.push(
        "normalizedPackage must be null when measurementRejected is true."
      );
    }
    if (input.pipelineStage === "result") {
      issues.push(
        'pipelineStage must not be "result" when measurementRejected is true.'
      );
    }
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Validate stage — fail-closed package, trust, and signature checks.
 * Returns issues when the package must be rejected at validate.
 */
function validatePipelinePackage(measurementPackage: unknown): readonly string[] {
  const issues: string[] = [];

  if (!isRecord(measurementPackage)) {
    return Object.freeze([
      "measurementPackage must be a Measurement Foundation package object.",
    ]);
  }

  const packageValidation =
    validateAdsMeasurementFoundationPackage(measurementPackage);
  if (!packageValidation.valid) {
    issues.push(...packageValidation.issues);
  }

  // Explicit trust / signature gates (fail closed even if shape drifts).
  if (measurementPackage.trustLevel !== ADS_MEASUREMENT_FOUNDATION_TRUST_LEVEL) {
    const message = `trustLevel must be "${ADS_MEASUREMENT_FOUNDATION_TRUST_LEVEL}".`;
    if (!issues.includes(message)) {
      issues.push(message);
    }
  }

  if (
    measurementPackage.signaturePlaceholder !==
    ADS_MEASUREMENT_FOUNDATION_SIGNATURE_PLACEHOLDER
  ) {
    const message = `signaturePlaceholder must be "${ADS_MEASUREMENT_FOUNDATION_SIGNATURE_PLACEHOLDER}".`;
    if (!issues.includes(message)) {
      issues.push(message);
    }
  }

  return Object.freeze([...issues]);
}

/**
 * Runs the Measurement Pipeline on a validated Measurement Foundation package.
 * Stages: Validate → Normalize → Deduplicate → Pipeline Result.
 * Fail-closed on malformed input and invalid packages.
 * Duplicate dedupe keys reject at the deduplicate stage (no storage).
 * Never stores, sends, measures at runtime, or touches network/DB.
 */
export function runAdsMeasurementPipeline(
  input: unknown
): AdsMeasurementPipelineOutcome {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([
        "Measurement pipeline input must be an object.",
      ]),
    };
  }

  const issues: string[] = [];
  for (const key of Object.keys(input)) {
    if (!INPUT_ALLOWED_FIELD_SET.has(key)) {
      issues.push(
        `Measurement pipeline input contains unknown field "${key}".`
      );
    }
  }
  if (!("measurementPackage" in input)) {
    issues.push("Measurement pipeline input must include measurementPackage.");
  }
  if (issues.length > 0) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  // --- Validate ---
  const validateIssues = validatePipelinePackage(input.measurementPackage);
  if (validateIssues.length > 0) {
    const result = rejectedResult("validate");
    const resultValidation = validateAdsMeasurementPipelineResult(result);
    if (!resultValidation.valid) {
      return {
        valid: false,
        issues: Object.freeze([
          ...validateIssues,
          ...resultValidation.issues,
        ]),
      };
    }
    return { valid: true, result };
  }

  const measurementPackage =
    input.measurementPackage as AdsMeasurementFoundationPackage;

  // --- Normalize ---
  const normalizedPackage = normalizeAdsMeasurementPackage(measurementPackage);
  const normalizedValidation =
    validateAdsMeasurementFoundationPackage(normalizedPackage);
  if (!normalizedValidation.valid) {
    const result = rejectedResult("normalize");
    const resultValidation = validateAdsMeasurementPipelineResult(result);
    if (!resultValidation.valid) {
      return {
        valid: false,
        issues: Object.freeze([
          ...normalizedValidation.issues,
          ...resultValidation.issues,
        ]),
      };
    }
    return { valid: true, result };
  }

  // --- Deduplicate ---
  let seenDedupeKeys: readonly string[] = [];
  if (input.seenDedupeKeys !== undefined) {
    if (
      !Array.isArray(input.seenDedupeKeys) ||
      !input.seenDedupeKeys.every((key) => typeof key === "string")
    ) {
      return {
        valid: false,
        issues: Object.freeze([
          "seenDedupeKeys must be an array of strings when provided.",
        ]),
      };
    }
    const seenSet = new Set<string>();
    for (const key of input.seenDedupeKeys) {
      if (seenSet.has(key)) {
        return {
          valid: false,
          issues: Object.freeze([
            `seenDedupeKeys contains duplicate dedupe key "${key}".`,
          ]),
        };
      }
      seenSet.add(key);
    }
    seenDedupeKeys = input.seenDedupeKeys;
  }

  if (!isNonEmptyString(normalizedPackage.dedupeKey)) {
    return {
      valid: false,
      issues: Object.freeze([
        "normalizedPackage.dedupeKey is required and must be a non-empty string.",
      ]),
    };
  }

  if (seenDedupeKeys.includes(normalizedPackage.dedupeKey)) {
    const result = rejectedResult("deduplicate");
    const resultValidation = validateAdsMeasurementPipelineResult(result);
    if (!resultValidation.valid) {
      return {
        valid: false,
        issues: Object.freeze([...resultValidation.issues]),
      };
    }
    return { valid: true, result };
  }

  // --- Pipeline Result ---
  const result = acceptedResult(normalizedPackage);
  const resultValidation = validateAdsMeasurementPipelineResult(result);
  if (!resultValidation.valid) {
    return {
      valid: false,
      issues: Object.freeze([...resultValidation.issues]),
    };
  }

  return { valid: true, result };
}
