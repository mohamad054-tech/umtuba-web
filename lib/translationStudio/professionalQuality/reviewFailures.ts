/**
 * Professional AI review failure semantics (fail-closed).
 */

export type ProfessionalReviewFailureCode =
  | "provider_timeout"
  | "transport_error"
  | "invalid_json"
  | "schema_mismatch"
  | "provider_unavailable"
  | "content_rejected"
  | "review_unavailable";

export type ProfessionalReviewFailure = {
  code: ProfessionalReviewFailureCode;
  message: string;
  /** Safe operational detail — never secrets. */
  detail?: Record<string, string | number | boolean | null>;
};

export const PROFESSIONAL_REVIEW_UNAVAILABLE = "PROFESSIONAL_REVIEW_UNAVAILABLE" as const;

export type ProfessionalReviewAvailability =
  | { available: true }
  | {
      available: false;
      status: typeof PROFESSIONAL_REVIEW_UNAVAILABLE;
      failure: ProfessionalReviewFailure;
    };

export function reviewFailure(
  code: ProfessionalReviewFailureCode,
  message: string,
  detail?: ProfessionalReviewFailure["detail"]
): ProfessionalReviewFailure {
  return { code, message, detail };
}
