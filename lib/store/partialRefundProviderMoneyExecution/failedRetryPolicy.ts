/**
 * V1 failed-execution retry policy — explicit, fail-closed.
 *
 * Confirmed provider rejection/business failure → terminal `failed`.
 * No automatic retry. No admin same-key retry in V1.
 * Future reopen/retry is a separate milestone.
 */

export const PARTIAL_REFUND_PROVIDER_MONEY_FAILED_RETRY_POLICY_V1 =
  "no_retry" as const;

export type PartialRefundProviderMoneyFailedRetryPolicy =
  typeof PARTIAL_REFUND_PROVIDER_MONEY_FAILED_RETRY_POLICY_V1;

export function isFailedProviderExecutionRetryAllowedInV1(): false {
  return false;
}

export function failedProviderExecutionRetryBlockedMessage(): string {
  return (
    "Prior provider execution failed; V1 does not allow retry under the same " +
    "idempotency key. Use a future reopen/retry milestone if needed."
  );
}
