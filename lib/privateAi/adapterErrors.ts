import type { AdapterFailureClass, NormalizedAdapterError } from "./types";

const RETRYABLE: ReadonlySet<AdapterFailureClass> = new Set([
  "adapter_unavailable",
  "provider_rate_limited",
  "provider_unavailable",
  "timeout_before_execution",
  "internal_adapter_error",
]);

const SAFE_MESSAGES: Record<AdapterFailureClass, string> = {
  adapter_unavailable: "Selected adapter is unavailable.",
  adapter_not_ready: "Selected adapter is not ready.",
  capability_unsupported: "Requested capability is not supported.",
  model_unsupported: "Requested model is not supported by the adapter.",
  invalid_execution_input: "Execution input failed validation.",
  timeout_before_execution: "Execution timed out before adapter invoke.",
  cancellation_before_execution: "Execution was cancelled before adapter invoke.",
  provider_rate_limited: "Provider rate limit reached.",
  provider_auth_failed: "Provider authentication failed.",
  provider_unavailable: "Provider is unavailable.",
  provider_rejected: "Provider rejected the request.",
  malformed_provider_response: "Provider response was malformed.",
  structured_output_invalid: "Structured output validation failed.",
  internal_adapter_error: "Internal adapter error.",
  no_eligible_adapter: "No eligible adapter for this execution plan.",
};

const SECRET_PATTERN =
  /(api[_-]?key|secret|token|password|authorization|bearer\s+[a-z0-9._-]+)/gi;

/** Strip secret-like substrings from diagnostics; never echo raw provider errors. */
export function redactSecretLikeText(input: string): string {
  return input.replace(SECRET_PATTERN, "[REDACTED]");
}

export function isRetryableAdapterFailure(cls: AdapterFailureClass): boolean {
  return RETRYABLE.has(cls);
}

export function normalizeAdapterError(input: {
  class: AdapterFailureClass;
  code?: string;
  rawDetail?: string | null;
  adminDiagnostic?: string | null;
}): NormalizedAdapterError {
  const admin = redactSecretLikeText(
    input.adminDiagnostic ?? input.rawDetail ?? input.class
  );
  return {
    class: input.class,
    code: input.code ?? input.class,
    safeMessage: SAFE_MESSAGES[input.class],
    retryable: isRetryableAdapterFailure(input.class),
    adminDiagnostic: admin.slice(0, 500),
    redacted: true,
  };
}

export function failureClassFromNegotiationReasons(
  reasons: string[]
): AdapterFailureClass {
  if (reasons.some((r) => r.includes("lifecycle_") || r === "not_ready")) {
    return "adapter_not_ready";
  }
  if (reasons.some((r) => r.includes("capability"))) {
    return "capability_unsupported";
  }
  if (reasons.some((r) => r.includes("model"))) {
    return "model_unsupported";
  }
  if (reasons.some((r) => r.includes("unavailable") || r === "disabled")) {
    return "adapter_unavailable";
  }
  if (reasons.length === 0) return "no_eligible_adapter";
  return "no_eligible_adapter";
}
