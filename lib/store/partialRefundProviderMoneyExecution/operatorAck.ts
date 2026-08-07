/**
 * Per-request operator acknowledgement + reason for first-time provider money execute.
 * Distinct from env gate ACK and production execution-mode ACK.
 */

export const PARTIAL_REFUND_PROVIDER_MONEY_OPERATOR_ACK_VALUE =
  "I_ACKNOWLEDGE_THIS_MAY_MOVE_PROVIDER_MONEY" as const;

export const PARTIAL_REFUND_PROVIDER_MONEY_OPERATOR_ACK_FIELD =
  "operatorMoneyAck" as const;

const REASON_MIN = 3;
const REASON_MAX = 500;

export function sanitizeProviderMoneyOperatorReason(
  raw: string | null | undefined
): { ok: true; reason: string } | { ok: false; message: string; code: "operator_reason_invalid" } {
  if (raw == null || raw.trim() === "") {
    return {
      ok: false,
      code: "operator_reason_invalid",
      message: `Operator reason is required (${REASON_MIN}–${REASON_MAX} characters).`,
    };
  }
  const t = raw.trim().replace(/\s+/g, " ");
  if (t.length < REASON_MIN || t.length > REASON_MAX) {
    return {
      ok: false,
      code: "operator_reason_invalid",
      message: `Operator reason must be ${REASON_MIN}–${REASON_MAX} characters.`,
    };
  }
  return { ok: true, reason: t.slice(0, REASON_MAX) };
}

/**
 * Exact acknowledgement value required on the server action.
 * Checkbox-only without the exact value fails closed.
 */
export function assertProviderMoneyOperatorAck(
  raw: string | null | undefined
):
  | { ok: true }
  | { ok: false; message: string; code: "operator_ack_missing" } {
  if (
    raw == null ||
    String(raw).trim() !== PARTIAL_REFUND_PROVIDER_MONEY_OPERATOR_ACK_VALUE
  ) {
    return {
      ok: false,
      code: "operator_ack_missing",
      message:
        "Explicit operator acknowledgement is required before provider money execute.",
    };
  }
  return { ok: true };
}
