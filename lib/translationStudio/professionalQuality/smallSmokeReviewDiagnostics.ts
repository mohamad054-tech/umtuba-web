/**
 * Sanitized reviewer-failure diagnostics for small-smoke reports.
 * Categorical only — never secrets, prompts, or raw provider bodies.
 */

import type { ProfessionalReviewFailure } from "./reviewFailures";

export const SMALL_SMOKE_REVIEWER_FAILURE_CATEGORIES = [
  "transport_error",
  "provider_http_error",
  "empty_response",
  "invalid_json",
  "schema_validation_failed",
  "missing_required_field",
  "parse_failed",
  "unknown_reviewer_failure",
] as const;

export type SmallSmokeReviewerFailureCategory =
  (typeof SMALL_SMOKE_REVIEWER_FAILURE_CATEGORIES)[number];

export type SmallSmokeReviewerFailureDiagnostics = {
  category: SmallSmokeReviewerFailureCategory;
  /** Internal professional failure code when known (safe enum). */
  failureCode?: string;
  /** HTTP status when safely extractable from operational metadata. */
  httpStatus?: number;
  providerId?: string;
  modelId?: string;
  /** Bounded retry/attempt count from transport when known. */
  attempts?: number;
  /** Whether a non-empty response payload was present (boolean only). */
  responsePresent?: boolean;
  /** Whether JSON object parse succeeded before schema validation. */
  jsonParseSucceeded?: boolean;
  /**
   * Validation issue name/path only (e.g. "dimensionScores.semantic_accuracy").
   * Never raw content.
   */
  validationIssue?: string;
  /** Which reviewer path was used when the failure occurred. */
  reviewerPath?: "live_transport" | "heuristic_sensitive" | "unknown";
};

const SECRETISH =
  /api[_-]?key|authorization|bearer\s|sk-[a-z0-9]|password|secret/i;

/**
 * Extract a safe validation issue token from a schema error message.
 * Returns null when the message looks secretish or unusable.
 */
export function extractSafeValidationIssue(
  message: string | undefined
): string | undefined {
  if (!message) return undefined;
  const trimmed = message.trim().slice(0, 160);
  if (!trimmed || SECRETISH.test(trimmed)) return undefined;

  const missingDim = trimmed.match(
    /missing required dimension score:\s*([a-z0-9_]+)/i
  );
  if (missingDim?.[1]) return `dimensionScores.${missingDim[1]}`;

  const forbidden = trimmed.match(/forbidden field rejected:\s*([A-Za-z0-9_]+)/);
  if (forbidden?.[1]) return `forbidden.${forbidden[1]}`;

  const providerField = trimmed.match(
    /^(provider(?:\.[A-Za-z0-9_]+)?)\s+required/i
  );
  if (providerField?.[1]) return providerField[1];

  if (/^object required$/i.test(trimmed)) return "root.object";
  if (/provider object required/i.test(trimmed)) return "provider";
  if (/dimensionScores/i.test(trimmed) && /required|invalid|missing/i.test(trimmed)) {
    return "dimensionScores";
  }
  if (/findings/i.test(trimmed) && /required|invalid|missing/i.test(trimmed)) {
    return "findings";
  }
  if (/confidence/i.test(trimmed)) return "confidence";
  if (/schemaVersion/i.test(trimmed)) return "schemaVersion";

  // Generic safe token: first path-like segment only.
  const pathish = trimmed.match(
    /\b([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*){0,3})\b/
  );
  if (pathish?.[1] && !SECRETISH.test(pathish[1])) {
    return pathish[1].slice(0, 80);
  }
  return undefined;
}

function extractHttpStatus(
  failure: ProfessionalReviewFailure
): number | undefined {
  const fromDetail = failure.detail?.httpStatus;
  if (typeof fromDetail === "number" && fromDetail >= 100 && fromDetail < 600) {
    return Math.floor(fromDetail);
  }
  const msg = failure.message ?? "";
  if (SECRETISH.test(msg)) return undefined;
  const m = msg.match(/\bHTTP\s*([1-5][0-9]{2})\b/i) || msg.match(/\b([1-5][0-9]{2})\b/);
  if (!m?.[1]) return undefined;
  const n = Number(m[1]);
  return n >= 100 && n < 600 ? n : undefined;
}

/**
 * Map an internal review failure into a sanitized smoke diagnostic.
 */
export function classifySmallSmokeReviewerFailure(input: {
  failure?: ProfessionalReviewFailure | null;
  providerId?: string | null;
  modelId?: string | null;
  reviewerPath?: SmallSmokeReviewerFailureDiagnostics["reviewerPath"];
}): SmallSmokeReviewerFailureDiagnostics {
  const failure = input.failure;
  const detail = failure?.detail ?? {};
  const code = failure?.code;
  const message = failure?.message ?? "";
  const validationIssue =
    (typeof detail.validationIssue === "string"
      ? extractSafeValidationIssue(detail.validationIssue)
      : undefined) ?? extractSafeValidationIssue(message);
  const httpStatus = failure ? extractHttpStatus(failure) : undefined;
  const attempts =
    typeof detail.attempts === "number" && detail.attempts >= 0
      ? Math.floor(detail.attempts)
      : undefined;
  const responsePresent =
    typeof detail.responsePresent === "boolean"
      ? detail.responsePresent
      : undefined;
  const jsonParseSucceeded =
    typeof detail.jsonParseSucceeded === "boolean"
      ? detail.jsonParseSucceeded
      : undefined;

  let category: SmallSmokeReviewerFailureCategory = "unknown_reviewer_failure";
  if (code === "invalid_json") {
    category = "invalid_json";
  } else if (code === "schema_mismatch") {
    category =
      validationIssue?.startsWith("dimensionScores.") ||
      /missing|required/i.test(message)
        ? "missing_required_field"
        : "schema_validation_failed";
  } else if (code === "provider_timeout" || code === "transport_error") {
    category = "transport_error";
  } else if (code === "provider_unavailable") {
    category = httpStatus ? "provider_http_error" : "transport_error";
  } else if (code === "content_rejected") {
    category = "unknown_reviewer_failure";
  } else if (/empty/i.test(message) && /response|payload|body/i.test(message)) {
    category = "empty_response";
  } else if (/json/i.test(message) && /parse|invalid/i.test(message)) {
    category = "parse_failed";
  } else if (httpStatus) {
    category = "provider_http_error";
  }

  const diagnostics: SmallSmokeReviewerFailureDiagnostics = {
    category,
  };
  if (code) diagnostics.failureCode = code;
  if (httpStatus != null) diagnostics.httpStatus = httpStatus;
  if (input.providerId) diagnostics.providerId = input.providerId.slice(0, 64);
  if (input.modelId) diagnostics.modelId = input.modelId.slice(0, 120);
  if (attempts != null) diagnostics.attempts = attempts;
  if (responsePresent != null) diagnostics.responsePresent = responsePresent;
  if (jsonParseSucceeded != null) {
    diagnostics.jsonParseSucceeded = jsonParseSucceeded;
  }
  if (validationIssue) diagnostics.validationIssue = validationIssue;
  if (input.reviewerPath) diagnostics.reviewerPath = input.reviewerPath;

  return diagnostics;
}

/** Assert sanitized diagnostics contain no secret-like material. */
export function assertSanitizedReviewerDiagnostics(
  diagnostics: SmallSmokeReviewerFailureDiagnostics
): boolean {
  const blob = JSON.stringify(diagnostics);
  return !SECRETISH.test(blob);
}
