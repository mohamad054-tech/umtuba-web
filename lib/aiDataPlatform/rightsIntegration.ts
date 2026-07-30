import type { KnowledgeEligibility, KnowledgeRightsRecord } from "../knowledgeAcquisition/types";
import {
  assertRightsAllowCustomization,
  assertRightsAllowTraining,
} from "../knowledgeAcquisition/rightsEngine";
import type { AiDatasetRecord, DatasetVersionRecord } from "./types";

export type DatasetExperimentGateResult = {
  allowed: boolean;
  blockers: string[];
};

/**
 * Only eligible datasets may enter experiments. Fail closed.
 * Integrates Knowledge Acquisition rights + eligibility.
 */
export function assertDatasetEligibleForExperiment(input: {
  dataset: AiDatasetRecord;
  version: DatasetVersionRecord;
}): DatasetExperimentGateResult {
  const blockers: string[] = [];

  if (input.dataset.status !== "approved" && input.dataset.status !== "ready") {
    blockers.push(`dataset_status_${input.dataset.status}`);
  }
  if (!input.version.approved) {
    blockers.push("version_not_approved");
  }
  if (input.dataset.eligibility.includes("ineligible")) {
    blockers.push("eligibility_ineligible");
  }
  if (
    !input.dataset.eligibility.includes("eligible_for_training") &&
    !input.dataset.eligibility.includes("eligible_for_model_customization") &&
    !input.dataset.eligibility.includes("dataset_eligible")
  ) {
    blockers.push("missing_experiment_eligibility_flag");
  }
  if (!input.dataset.rights.internalUse) {
    blockers.push("rights_internal_use_denied");
  }
  if (
    input.dataset.rights.status === "unknown" ||
    input.dataset.rights.status === "restricted"
  ) {
    blockers.push(`rights_${input.dataset.rights.status}`);
  }
  if (input.dataset.quality.blockingFindings.length > 0) {
    blockers.push("quality_blocking");
  }
  if (input.dataset.sensitivity === "restricted") {
    blockers.push("sensitivity_restricted");
  }

  return { allowed: blockers.length === 0, blockers };
}

export function summarizeRightsForDataset(rights: KnowledgeRightsRecord): {
  trainingAllowed: boolean;
  customizationAllowed: boolean;
  status: KnowledgeRightsRecord["status"];
} {
  return {
    trainingAllowed: assertRightsAllowTraining(rights),
    customizationAllowed: assertRightsAllowCustomization(rights),
    status: rights.status,
  };
}

export function hasExperimentEligibility(
  eligibility: KnowledgeEligibility[]
): boolean {
  if (eligibility.includes("ineligible")) return false;
  return (
    eligibility.includes("dataset_eligible") ||
    eligibility.includes("eligible_for_training") ||
    eligibility.includes("eligible_for_model_customization")
  );
}
