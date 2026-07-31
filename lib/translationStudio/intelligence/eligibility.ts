import type {
  ContentSensitivity,
  IntelligenceEligibility,
  QualityScoreReport,
  TrustLevel,
  UsageRightsRecord,
} from "./types";

export type EligibilityInput = {
  approved: boolean;
  trustLevel: TrustLevel;
  usageRights: UsageRightsRecord;
  quality: QualityScoreReport;
  sensitivity: ContentSensitivity;
};

/**
 * Explicit multi-flag eligibility. No automatic broad grant.
 * Fail closed for unknown/restricted rights on customization.
 */
export function decideIntelligenceEligibility(
  input: EligibilityInput
): IntelligenceEligibility[] {
  if (!input.approved || input.trustLevel === "rejected") {
    return ["ineligible"];
  }
  if (input.trustLevel === "untrusted_candidate") {
    return ["ineligible"];
  }
  if (input.quality.blockingFindings.length > 0) {
    const flags: IntelligenceEligibility[] = [];
    if (input.usageRights.permissionReuseInternally) {
      flags.push("eligible_for_quality_analysis");
    }
    return flags.length > 0 ? flags : ["ineligible"];
  }
  if (
    input.sensitivity === "restricted" ||
    input.sensitivity === "confidential"
  ) {
    return input.usageRights.permissionReuseInternally
      ? ["eligible_for_quality_analysis"]
      : ["ineligible"];
  }

  const flags: IntelligenceEligibility[] = [];

  if (
    input.trustLevel === "trusted_approved" ||
    input.trustLevel === "trusted_internal"
  ) {
    if (input.usageRights.permissionReuseInternally) {
      flags.push("eligible_for_quality_analysis");
      flags.push("eligible_for_translation_memory");
      if (input.quality.overallScore >= 0.7) {
        flags.push("eligible_for_prompt_examples");
      }
    }
    if (
      input.usageRights.permissionModelCustomization &&
      input.usageRights.status !== "unknown" &&
      input.usageRights.status !== "restricted" &&
      input.usageRights.status !== "licensed_project_only" &&
      input.quality.overallScore >= 0.85
    ) {
      flags.push("eligible_for_model_customization");
    }
  }

  return flags.length > 0 ? flags : ["ineligible"];
}

export function canEnterTranslationMemory(
  eligibility: IntelligenceEligibility[]
): boolean {
  return eligibility.includes("eligible_for_translation_memory");
}

export function canEnterModelCustomizationDataset(
  eligibility: IntelligenceEligibility[]
): boolean {
  return eligibility.includes("eligible_for_model_customization");
}
