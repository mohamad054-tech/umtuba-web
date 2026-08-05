import type {
  AcquisitionStage,
  KnowledgeEligibility,
  KnowledgeQualityReport,
  KnowledgeRightsRecord,
  PrivacyReport,
} from "./types";
import {
  assertRightsAllowCustomization,
  assertRightsAllowTraining,
} from "./rightsEngine";

export type EligibilityInput = {
  stage: AcquisitionStage;
  rights: KnowledgeRightsRecord;
  quality: KnowledgeQualityReport;
  privacy: PrivacyReport;
};

/**
 * Explicit multi-flag eligibility. Nothing becomes reusable automatically.
 * Fail closed for unknown/restricted rights on training/customization.
 */
export function decideKnowledgeEligibility(
  input: EligibilityInput
): KnowledgeEligibility[] {
  if (input.stage === "rejected") return ["ineligible"];
  if (input.privacy.blocking) return ["ineligible"];
  if (input.quality.blockingFindings.length > 0) {
    return input.rights.internalUse ? ["eligible_for_internal_reuse"] : ["ineligible"];
  }
  if (!input.rights.internalUse) return ["ineligible"];

  const flags: KnowledgeEligibility[] = ["eligible_for_internal_reuse"];

  const advancedStages: AcquisitionStage[] = [
    "approved",
    "dataset_eligible",
  ];
  if (!advancedStages.includes(input.stage)) {
    return flags;
  }

  if (input.quality.overallScore >= 0.7) {
    flags.push("dataset_eligible");
  }
  if (
    assertRightsAllowCustomization(input.rights) &&
    input.quality.overallScore >= 0.8 &&
    input.stage === "dataset_eligible"
  ) {
    flags.push("eligible_for_model_customization");
  }
  if (
    assertRightsAllowTraining(input.rights) &&
    input.quality.overallScore >= 0.85 &&
    input.stage === "dataset_eligible"
  ) {
    flags.push("eligible_for_training");
  }
  if (input.rights.redistributionPermission) {
    flags.push("eligible_for_redistribution");
  }

  return flags;
}
