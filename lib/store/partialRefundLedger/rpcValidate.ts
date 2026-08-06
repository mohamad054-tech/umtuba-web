/**
 * Pure validation for privileged ledger RPC argument bags.
 * Rejects client money keys and malformed payloads before any RPC call.
 */

import {
  PARTIAL_REFUND_LEDGER_RPCS,
  PARTIAL_REFUND_RPC_READINESS_ID,
  PARTIAL_REFUND_RPC_READINESS_VERSION,
  partialRefundRpcReadinessOwnership,
  type BeginStorePartialRefundLedgerRpcArgs,
  type FailStorePartialRefundLedgerRpcArgs,
  type PartialRefundLedgerRpcName,
  type PlanStorePartialRefundLedgerRpcArgs,
} from "./rpcContracts";
import { isPartialRefundLedgerUuid, validateIdempotencyKey } from "./validate";

const CLIENT_MONEY_KEYS = [
  "amountMinor",
  "amount_minor",
  "trustedAmountMinor",
  "clientRefundAmountMinor",
  "grandTotalMinor",
] as const;

export type RpcArgValidationResult =
  | {
      ok: true;
      capability: typeof PARTIAL_REFUND_RPC_READINESS_ID;
      version: typeof PARTIAL_REFUND_RPC_READINESS_VERSION;
      ownership: ReturnType<typeof partialRefundRpcReadinessOwnership>;
    }
  | {
      ok: false;
      capability: typeof PARTIAL_REFUND_RPC_READINESS_ID;
      version: typeof PARTIAL_REFUND_RPC_READINESS_VERSION;
      ownership: ReturnType<typeof partialRefundRpcReadinessOwnership>;
      code:
        | "client_money_rejected"
        | "malformed_id"
        | "malformed_idempotency_key"
        | "malformed_quantity"
        | "empty_lines"
        | "inconsistent_line_math"
        | "zero_amount"
        | "negative_amount"
        | "currency_mismatch"
        | "unknown_rpc"
        | "public_exposure_forbidden";
      message: string;
    };

function fail(
  code: Extract<RpcArgValidationResult, { ok: false }>["code"],
  message: string
): RpcArgValidationResult {
  return {
    ok: false,
    capability: PARTIAL_REFUND_RPC_READINESS_ID,
    version: PARTIAL_REFUND_RPC_READINESS_VERSION,
    ownership: partialRefundRpcReadinessOwnership(),
    code,
    message,
  };
}

function ok(): RpcArgValidationResult {
  return {
    ok: true,
    capability: PARTIAL_REFUND_RPC_READINESS_ID,
    version: PARTIAL_REFUND_RPC_READINESS_VERSION,
    ownership: partialRefundRpcReadinessOwnership(),
  };
}

export function rejectClientMoneyOnRpcBag(
  bag: Record<string, unknown>
): RpcArgValidationResult {
  for (const key of CLIENT_MONEY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(bag, key)) {
      return fail(
        "client_money_rejected",
        "RPC args must not carry client monetary authority fields."
      );
    }
  }
  return ok();
}

export function assertLedgerRpcNotPubliclyExposed(
  grantTargets: readonly string[]
): RpcArgValidationResult {
  const forbidden = grantTargets.filter((t) =>
    ["anon", "authenticated", "public"].includes(t)
  );
  if (forbidden.length > 0) {
    return fail(
      "public_exposure_forbidden",
      `Ledger RPCs must not grant execute to: ${forbidden.join(", ")}.`
    );
  }
  return ok();
}

export function isKnownPartialRefundLedgerRpc(
  name: string
): name is PartialRefundLedgerRpcName {
  return (Object.values(PARTIAL_REFUND_LEDGER_RPCS) as string[]).includes(name);
}

export function validatePlanRpcArgs(
  args: PlanStorePartialRefundLedgerRpcArgs
): RpcArgValidationResult {
  const money = rejectClientMoneyOnRpcBag(args as unknown as Record<string, unknown>);
  if (!money.ok) return money;

  if (
    !isPartialRefundLedgerUuid(args.ledgerId) ||
    !isPartialRefundLedgerUuid(args.storeId) ||
    !isPartialRefundLedgerUuid(args.orderId) ||
    !isPartialRefundLedgerUuid(args.paymentAttemptId) ||
    !isPartialRefundLedgerUuid(args.captureEventId)
  ) {
    return fail("malformed_id", "Plan RPC ids are malformed.");
  }
  const idem = validateIdempotencyKey(args.idempotencyKey);
  if (!idem.ok) {
    return fail("malformed_idempotency_key", idem.message);
  }
  if (!Number.isInteger(args.refundAmountMinor) || args.refundAmountMinor < 0) {
    return fail("negative_amount", "Refund amount must be a non-negative integer.");
  }
  if (args.refundAmountMinor === 0) {
    return fail("zero_amount", "Refund amount must be positive.");
  }
  if (!Number.isInteger(args.captureAmountMinor) || args.captureAmountMinor <= 0) {
    return fail("zero_amount", "Capture amount must be a positive integer.");
  }
  if (args.currency.trim().toUpperCase().length !== 3) {
    return fail("currency_mismatch", "Currency must be a 3-letter code.");
  }
  if (!Array.isArray(args.lines) || args.lines.length === 0) {
    return fail("empty_lines", "Plan RPC requires ledger lines.");
  }
  let sum = 0;
  for (const line of args.lines) {
    if (!isPartialRefundLedgerUuid(line.orderItemId)) {
      return fail("malformed_id", "Line order item id is malformed.");
    }
    if (!Number.isInteger(line.requestedQuantity) || line.requestedQuantity <= 0) {
      return fail("malformed_quantity", "Line quantity must be a positive integer.");
    }
    if (!Number.isInteger(line.refundAmountMinor) || line.refundAmountMinor <= 0) {
      return fail("zero_amount", "Line refund amount must be positive.");
    }
    sum += line.refundAmountMinor;
  }
  if (sum !== args.refundAmountMinor) {
    return fail(
      "inconsistent_line_math",
      "Sum of line amounts must equal plan refund amount."
    );
  }
  return ok();
}

export function validateBeginRpcArgs(
  args: BeginStorePartialRefundLedgerRpcArgs
): RpcArgValidationResult {
  if (!isPartialRefundLedgerUuid(args.ledgerId)) {
    return fail("malformed_id", "Begin RPC ledger id is malformed.");
  }
  const entries = Object.entries(args.purchasedQuantityByLineId ?? {});
  if (entries.length === 0) {
    return fail("empty_lines", "Begin RPC requires purchased quantity map.");
  }
  for (const [id, qty] of entries) {
    if (!isPartialRefundLedgerUuid(id)) {
      return fail("malformed_id", "Purchased-quantity map has malformed line id.");
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      return fail("malformed_quantity", "Purchased quantity must be a positive integer.");
    }
  }
  return ok();
}

export function validateFailRpcArgs(
  args: FailStorePartialRefundLedgerRpcArgs
): RpcArgValidationResult {
  if (!isPartialRefundLedgerUuid(args.ledgerId)) {
    return fail("malformed_id", "Fail RPC ledger id is malformed.");
  }
  const code = args.failureCode.trim();
  const msg = args.failureMessageSafe.trim();
  if (code.length < 1 || code.length > 80) {
    return fail("malformed_idempotency_key", "failureCode must be 1..80 characters.");
  }
  if (msg.length < 1 || msg.length > 500) {
    return fail("malformed_idempotency_key", "failureMessageSafe must be 1..500 characters.");
  }
  return ok();
}

export function assertRemoteApplyNotOwned(): RpcArgValidationResult {
  return fail(
    "public_exposure_forbidden",
    "Remote migration apply is not owned by RPC readiness — requires a separate GO."
  );
}
