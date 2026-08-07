/**
 * Deterministic cache-key foundation for professional review (no external cache yet).
 */

import { createHash } from "node:crypto";
import type { ProfessionalTranslationRequestContext } from "./contextBuilder";

export const PROFESSIONAL_REVIEW_CACHE_SCHEMA_VERSION = 1;
export const PROFESSIONAL_GLOSSARY_CATALOG_VERSION = "umtuba_official_seed_v1";
export const PROFESSIONAL_STYLE_GUIDE_VERSION = "locale_style_guides_v1";
export const PROFESSIONAL_REVIEWER_MODEL_VERSION = "professional_reviewer_contract_v1";

export type ProfessionalReviewCacheKeyInput = {
  sourceText: string;
  targetText: string;
  sourceLocale: string;
  targetLocale: string;
  profileId: string;
  glossaryVersion?: string;
  styleGuideVersion?: string;
  reviewerModelVersion?: string;
  contextPackId?: string;
};

export function buildProfessionalReviewCacheKey(
  input: ProfessionalReviewCacheKeyInput
): string {
  const payload = [
    `v=${PROFESSIONAL_REVIEW_CACHE_SCHEMA_VERSION}`,
    `src=${hashText(input.sourceText)}`,
    `tgt=${hashText(input.targetText)}`,
    `sl=${input.sourceLocale}`,
    `tl=${input.targetLocale}`,
    `profile=${input.profileId}`,
    `glossary=${input.glossaryVersion ?? PROFESSIONAL_GLOSSARY_CATALOG_VERSION}`,
    `style=${input.styleGuideVersion ?? PROFESSIONAL_STYLE_GUIDE_VERSION}`,
    `model=${input.reviewerModelVersion ?? PROFESSIONAL_REVIEWER_MODEL_VERSION}`,
    `pack=${input.contextPackId ?? "global"}`,
  ].join("|");
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export function buildProfessionalReviewCacheKeyFromContext(input: {
  context: ProfessionalTranslationRequestContext;
  targetText: string;
  reviewerModelVersion?: string;
}): string {
  return buildProfessionalReviewCacheKey({
    sourceText: input.context.sourceText,
    targetText: input.targetText,
    sourceLocale: input.context.sourceLocale,
    targetLocale: input.context.targetLocale,
    profileId: input.context.qualityProfile.id,
    contextPackId: input.context.contextPack.id,
    reviewerModelVersion: input.reviewerModelVersion,
  });
}

function hashText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16);
}
