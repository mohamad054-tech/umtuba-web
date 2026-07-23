import type { ContractValidationResult } from "./creativeContracts";
import {
  buildAdsCandidateProvenanceBinding,
  validateAdsCandidateProvenanceBinding,
  type AdsCandidateProvenanceBinding,
} from "./candidateProvenance";
import {
  ADS_CANDIDATE_SELECTION_CONTRACT_VERSION,
  parseAdsCandidateSelectionInventory,
  validateAdsCandidateSelectionResult,
  type AdsCandidateSelectionInventory,
  type AdsCandidateSelectionResult,
  type AdsSelectionCandidate,
} from "./candidateSelection";
import type { AdsPlatformCreativeType } from "./creativeContracts";
import type { AdsRenderEligibleCandidate } from "./renderDescriptorPipeline";

/**
 * Ads Selection → Render Adapter V1 — typed handoff, no client reconstruction.
 *
 * Candidate Selection output is the authoritative eligibility source.
 * The full inventory candidate supplies placement / creative / eligibility /
 * ad-set / ad identity. Callers supply only candidateId (must be eligible).
 *
 * Emits:
 * - AdsRenderEligibleCandidate (Render Descriptor Pipeline input)
 * - AdsCandidateProvenanceBinding (issued identity continuity token)
 *
 * Never ranks, delivers, renders, or enables production.
 */

export const ADS_SELECTION_RENDER_ADAPTER_CONTRACT_VERSION = "v1" as const;

/**
 * Top-level keys allowed on adapter input.
 * Unknown fields fail closed. adSetRef / adRef are NOT accepted here —
 * they come only from the authoritative inventory candidate.
 */
export const ADS_SELECTION_RENDER_ADAPTER_INPUT_ALLOWED_FIELDS = [
  "inventory",
  "selectionResult",
  "candidateId",
] as const;

export type AdsSelectionRenderAdapterInput = Readonly<{
  inventory: AdsCandidateSelectionInventory;
  selectionResult: AdsCandidateSelectionResult;
  /** Must appear in selectionResult.eligibleCandidates. */
  candidateId: string;
}>;

export type AdsSelectionRenderAdapterResult = Readonly<{
  contractVersion: typeof ADS_SELECTION_RENDER_ADAPTER_CONTRACT_VERSION;
  eligibleCandidate: AdsRenderEligibleCandidate;
  provenance: AdsCandidateProvenanceBinding;
  productionEnabled: false;
}>;

export type AdsSelectionRenderAdapterOutcome =
  | Readonly<{ valid: true; result: AdsSelectionRenderAdapterResult }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

const INPUT_ALLOWED = new Set<string>(
  ADS_SELECTION_RENDER_ADAPTER_INPUT_ALLOWED_FIELDS
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function freezeEligibleCandidate(
  candidate: AdsRenderEligibleCandidate
): AdsRenderEligibleCandidate {
  return Object.freeze({
    candidateId: candidate.candidateId,
    campaignRef: candidate.campaignRef,
    advertiserRef: candidate.advertiserRef,
    creativeRef: candidate.creativeRef,
    placementId: candidate.placementId,
    creativeType: candidate.creativeType,
    adSetRef: candidate.adSetRef,
    adRef: candidate.adRef,
    eligibility: Object.freeze({
      campaignActive: candidate.eligibility.campaignActive,
      creativeActive: candidate.eligibility.creativeActive,
      policyAllowed: candidate.eligibility.policyAllowed,
      requiresAgeGate: candidate.eligibility.requiresAgeGate,
    }),
  });
}

function findInventoryCandidate(
  inventory: AdsCandidateSelectionInventory,
  candidateId: string
): AdsSelectionCandidate | null {
  for (const candidate of inventory.candidates) {
    if (candidate.candidateId === candidateId) {
      return candidate;
    }
  }
  return null;
}

/**
 * Pure shape validator for adapter results.
 */
export function validateAdsSelectionRenderAdapterResult(
  input: unknown
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([
        "Selection render adapter result must be an object.",
      ]),
    };
  }

  const issues: string[] = [];
  if (
    input.contractVersion !== ADS_SELECTION_RENDER_ADAPTER_CONTRACT_VERSION
  ) {
    issues.push(
      `contractVersion must be "${ADS_SELECTION_RENDER_ADAPTER_CONTRACT_VERSION}".`
    );
  }
  if (input.productionEnabled !== false) {
    issues.push("productionEnabled must be false.");
  }
  if (!isRecord(input.eligibleCandidate)) {
    issues.push("eligibleCandidate is required and must be an object.");
  }
  if (!isRecord(input.provenance)) {
    issues.push("provenance is required and must be an object.");
  } else {
    const provenanceCheck = validateAdsCandidateProvenanceBinding(
      input.provenance
    );
    if (!provenanceCheck.valid) {
      issues.push(
        ...provenanceCheck.issues.map((issue) => `provenance: ${issue}`)
      );
    }
  }

  if (
    isRecord(input.eligibleCandidate) &&
    isRecord(input.provenance) &&
    isNonEmptyString(input.eligibleCandidate.candidateId) &&
    isNonEmptyString(input.provenance.candidateId) &&
    input.eligibleCandidate.candidateId !== input.provenance.candidateId
  ) {
    issues.push(
      "eligibleCandidate.candidateId must match provenance.candidateId."
    );
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Adapts Candidate Selection output into a Render-eligible candidate +
 * issued provenance binding. Fail closed. Never reconstructs eligibility or
 * ad-set/ad identity from caller-asserted fields — inventory wins.
 */
export function adaptAdsSelectionToRenderEligible(
  input: unknown
): AdsSelectionRenderAdapterOutcome {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([
        "Selection render adapter input must be an object.",
      ]),
    };
  }

  const issues: string[] = [];
  for (const key of Object.keys(input)) {
    if (!INPUT_ALLOWED.has(key)) {
      issues.push(`unknown field "${key}" is not allowed.`);
    }
  }

  if (!isNonEmptyString(input.candidateId)) {
    issues.push("candidateId is required and must be a non-empty string.");
  }

  const inventoryParsed = parseAdsCandidateSelectionInventory(input.inventory);
  if (!inventoryParsed.valid) {
    issues.push(
      ...inventoryParsed.issues.map((issue) => `inventory: ${issue}`)
    );
  }

  const selectionValidation = validateAdsCandidateSelectionResult(
    input.selectionResult
  );
  if (!selectionValidation.valid) {
    issues.push(
      ...selectionValidation.issues.map(
        (issue) => `selectionResult: ${issue}`
      )
    );
  }

  if (
    issues.length > 0 ||
    !inventoryParsed.valid ||
    !selectionValidation.valid ||
    !isNonEmptyString(input.candidateId)
  ) {
    return {
      valid: false,
      issues: Object.freeze(
        issues.length > 0
          ? [...issues]
          : ["Selection render adapter input is malformed."]
      ),
    };
  }

  const inventory = inventoryParsed.value;
  const selectionResult = input.selectionResult as AdsCandidateSelectionResult;
  const candidateId = input.candidateId;

  if (
    selectionResult.contractVersion !== ADS_CANDIDATE_SELECTION_CONTRACT_VERSION
  ) {
    return {
      valid: false,
      issues: Object.freeze([
        `selectionResult.contractVersion must be "${ADS_CANDIDATE_SELECTION_CONTRACT_VERSION}".`,
      ]),
    };
  }

  if (selectionResult.productionEnabled !== false) {
    return {
      valid: false,
      issues: Object.freeze([
        "selectionResult.productionEnabled must be false.",
      ]),
    };
  }

  if (
    selectionResult.diagnostics.inventorySourceId !== inventory.sourceId ||
    selectionResult.diagnostics.inventoryRevision !== inventory.revision
  ) {
    return {
      valid: false,
      issues: Object.freeze([
        "selectionResult diagnostics inventory markers must match inventory.",
      ]),
    };
  }

  const eligibleRef = selectionResult.eligibleCandidates.find(
    (entry) => entry.candidateId === candidateId
  );
  if (!eligibleRef) {
    return {
      valid: false,
      issues: Object.freeze([
        `candidateId "${candidateId}" is not present in selectionResult.eligibleCandidates.`,
      ]),
    };
  }

  const inventoryCandidate = findInventoryCandidate(inventory, candidateId);
  if (inventoryCandidate === null) {
    return {
      valid: false,
      issues: Object.freeze([
        `candidateId "${candidateId}" is missing from inventory (no client reconstruction).`,
      ]),
    };
  }

  if (eligibleRef.campaignRef !== inventoryCandidate.campaignRef) {
    return {
      valid: false,
      issues: Object.freeze([
        "eligible campaignRef mismatch against inventory candidate.",
      ]),
    };
  }
  if (eligibleRef.advertiserRef !== inventoryCandidate.advertiserRef) {
    return {
      valid: false,
      issues: Object.freeze([
        "eligible advertiserRef mismatch against inventory candidate.",
      ]),
    };
  }
  if (eligibleRef.creativeRef !== inventoryCandidate.creativeRef) {
    return {
      valid: false,
      issues: Object.freeze([
        "eligible creativeRef mismatch against inventory candidate.",
      ]),
    };
  }
  if (eligibleRef.adSetRef !== inventoryCandidate.adSetRef) {
    return {
      valid: false,
      issues: Object.freeze([
        "eligible adSetRef mismatch against inventory candidate.",
      ]),
    };
  }
  if (eligibleRef.adRef !== inventoryCandidate.adRef) {
    return {
      valid: false,
      issues: Object.freeze([
        "eligible adRef mismatch against inventory candidate.",
      ]),
    };
  }

  const eligibleCandidate = freezeEligibleCandidate({
    candidateId: inventoryCandidate.candidateId,
    campaignRef: inventoryCandidate.campaignRef,
    advertiserRef: inventoryCandidate.advertiserRef,
    creativeRef: inventoryCandidate.creativeRef,
    placementId: inventoryCandidate.placementId,
    creativeType: inventoryCandidate.creativeType as AdsPlatformCreativeType,
    adSetRef: inventoryCandidate.adSetRef,
    adRef: inventoryCandidate.adRef,
    eligibility: {
      campaignActive: inventoryCandidate.eligibility.campaignActive,
      creativeActive: inventoryCandidate.eligibility.creativeActive,
      policyAllowed: inventoryCandidate.eligibility.policyAllowed,
      requiresAgeGate: inventoryCandidate.eligibility.requiresAgeGate,
    },
  });

  const provenanceOutcome = buildAdsCandidateProvenanceBinding({
    candidateId: eligibleCandidate.candidateId,
    campaignRef: eligibleCandidate.campaignRef,
    advertiserRef: eligibleCandidate.advertiserRef,
    creativeRef: eligibleCandidate.creativeRef,
    placementId: eligibleCandidate.placementId,
    adSetRef: eligibleCandidate.adSetRef,
    adRef: eligibleCandidate.adRef,
    selectionRequestId: selectionResult.selectionMetadata.selectionRequestId,
    inventorySourceId: inventory.sourceId,
    inventoryRevision: inventory.revision,
  });
  if (!provenanceOutcome.valid) {
    return {
      valid: false,
      issues: Object.freeze([
        ...provenanceOutcome.issues.map((issue) => `provenance: ${issue}`),
      ]),
    };
  }

  const result: AdsSelectionRenderAdapterResult = Object.freeze({
    contractVersion: ADS_SELECTION_RENDER_ADAPTER_CONTRACT_VERSION,
    eligibleCandidate,
    provenance: provenanceOutcome.provenance,
    productionEnabled: false as const,
  });

  const resultValidation = validateAdsSelectionRenderAdapterResult(result);
  if (!resultValidation.valid) {
    return {
      valid: false,
      issues: Object.freeze([...resultValidation.issues]),
    };
  }

  return { valid: true, result };
}
