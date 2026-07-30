import type { TranslationValueStatus } from "./types";

const ALLOWED_TRANSITIONS: Record<
  TranslationValueStatus,
  ReadonlySet<TranslationValueStatus>
> = {
  missing: new Set(["ai_suggested", "needs_review", "approved", "deprecated"]),
  ai_suggested: new Set(["needs_review", "approved", "deprecated", "missing"]),
  needs_review: new Set(["approved", "ai_suggested", "deprecated", "missing"]),
  approved: new Set(["needs_review", "deprecated"]),
  deprecated: new Set(["missing", "needs_review"]),
};

export function canTransitionTranslationStatus(
  from: TranslationValueStatus,
  to: TranslationValueStatus
): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.has(to) ?? false;
}

export function assertTransitionTranslationStatus(
  from: TranslationValueStatus,
  to: TranslationValueStatus
): void {
  if (!canTransitionTranslationStatus(from, to)) {
    throw new Error(`Invalid translation status transition: ${from} → ${to}`);
  }
}

/** Human approval is required before Memory publish — never auto-approve AI. */
export function isPublishableToMemory(
  status: TranslationValueStatus
): boolean {
  return status === "approved";
}
