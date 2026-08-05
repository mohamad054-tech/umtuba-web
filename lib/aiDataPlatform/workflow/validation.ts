import type { PrivacyReport } from "../../knowledgeAcquisition/types";
import type {
  QualityValidationInput,
  RightsValidationInput,
  ValidationCheckResult,
} from "./types";

function result(
  blockers: string[],
  warnings: string[] = [],
  now = new Date().toISOString()
): ValidationCheckResult {
  return {
    ok: blockers.length === 0,
    blockers,
    warnings,
    checkedAt: now,
  };
}

/**
 * Fail closed on unknown/restricted/expired rights and unapproved assets.
 * Integrates Knowledge Acquisition rights semantics.
 */
export function validateDatasetRights(
  input: RightsValidationInput
): ValidationCheckResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const now = input.now ?? new Date().toISOString();

  if (input.rights.status === "unknown") blockers.push("rights_unknown");
  if (input.rights.status === "restricted") blockers.push("rights_restricted");
  if (!input.rights.internalUse) blockers.push("rights_internal_use_denied");

  if (input.rights.expiration) {
    const exp = Date.parse(input.rights.expiration);
    if (!Number.isNaN(exp) && exp < Date.parse(now)) {
      blockers.push("rights_expired");
    }
  }

  const unapproved = input.unapprovedAssetIds ?? [];
  if (unapproved.length > 0) {
    blockers.push(`unapproved_assets:${unapproved.join(",")}`);
  }

  if (input.eligibility.includes("ineligible")) {
    blockers.push("eligibility_ineligible");
  }

  if (
    input.rights.attributionRequired &&
    !input.rights.attributionNotes
  ) {
    warnings.push("attribution_notes_missing");
  }

  return result(blockers, warnings, now);
}

export function validateDatasetPrivacy(
  privacy: PrivacyReport,
  now = new Date().toISOString()
): ValidationCheckResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (privacy.blocking) blockers.push("privacy_blocking");
  for (const f of privacy.findings) {
    if (f.severity === "blocking") blockers.push(`privacy_${f.kind}`);
    else if (f.severity === "warning") warnings.push(`privacy_${f.kind}`);
  }
  return result([...new Set(blockers)], [...new Set(warnings)], now);
}

/**
 * Dataset cannot become Approved unless quality, metadata, privacy,
 * rights, and eligibility gates pass.
 */
export function validateDatasetQualityForApproval(
  input: QualityValidationInput
): ValidationCheckResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const min = input.minimumOverallScore ?? 0.7;

  if (input.quality.overallScore < min) {
    blockers.push(`quality_below_minimum:${input.quality.overallScore}`);
  }
  if (input.quality.blockingFindings.length > 0) {
    blockers.push(
      `quality_blocking:${input.quality.blockingFindings.join(",")}`
    );
  }
  if (!input.description.trim()) blockers.push("metadata_description_missing");
  if (input.languages.length === 0) blockers.push("metadata_languages_missing");
  if (input.domains.length === 0) blockers.push("metadata_domains_missing");

  const privacy = validateDatasetPrivacy(input.privacy);
  blockers.push(...privacy.blockers);
  warnings.push(...privacy.warnings);

  const rights = validateDatasetRights({
    rights: input.rights,
    eligibility: input.eligibility,
    sourceAssetIds: [],
  });
  blockers.push(...rights.blockers);
  warnings.push(...rights.warnings);

  if (
    !input.eligibility.includes("dataset_eligible") &&
    !input.eligibility.includes("eligible_for_training") &&
    !input.eligibility.includes("eligible_for_model_customization") &&
    !input.eligibility.includes("eligible_for_internal_reuse")
  ) {
    blockers.push("eligibility_invalid");
  }
  if (input.eligibility.includes("ineligible")) {
    blockers.push("eligibility_ineligible");
  }

  return result([...new Set(blockers)], [...new Set(warnings)]);
}

export function emptyChecks(): import("./types").DatasetWorkflowChecks {
  return {
    validated: null,
    quality: null,
    rights: null,
    privacy: null,
    eligibility: null,
  };
}
