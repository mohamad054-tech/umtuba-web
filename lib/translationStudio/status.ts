import type { TranslationValueStatus } from "./types";

const ALLOWED_TRANSITIONS: Record<
  TranslationValueStatus,
  ReadonlySet<TranslationValueStatus>
> = {
  missing: new Set([
    "draft",
    "ai_suggested",
    "needs_review",
    "approved",
    "ready_for_publish",
    "deprecated",
  ]),
  draft: new Set([
    "needs_review",
    "ai_suggested",
    "approved",
    "ready_for_publish",
    "rejected",
    "deprecated",
    "missing",
  ]),
  ai_suggested: new Set([
    "needs_review",
    "draft",
    "approved",
    "ready_for_publish",
    "rejected",
    "deprecated",
    "missing",
  ]),
  needs_review: new Set([
    "approved",
    "rejected",
    "draft",
    "ai_suggested",
    "deprecated",
    "ready_for_publish",
  ]),
  approved: new Set([
    "ready_for_publish",
    "needs_review",
    "deprecated",
    "draft",
    "ai_suggested",
  ]),
  rejected: new Set(["draft", "needs_review", "deprecated", "ai_suggested"]),
  deprecated: new Set(["draft", "needs_review", "missing", "ai_suggested"]),
  ready_for_publish: new Set([
    "approved",
    "deprecated",
    "needs_review",
    "ai_suggested",
  ]),
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

/** Memory only accepts human-approved wording. */
export function isPublishableToMemory(
  status: TranslationValueStatus
): boolean {
  return status === "approved" || status === "ready_for_publish";
}

/** Future publisher may read only these statuses. */
export function isPublishCatalogEligible(
  status: TranslationValueStatus
): boolean {
  return status === "approved" || status === "ready_for_publish";
}

export function isReviewQueueStatus(
  status: TranslationValueStatus
): boolean {
  return (
    status === "ai_suggested" ||
    status === "needs_review" ||
    status === "draft"
  );
}
