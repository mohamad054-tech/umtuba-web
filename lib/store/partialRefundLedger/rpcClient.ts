/**
 * Injected privileged RPC client boundary for partial-refund ledger.
 *
 * Callers must supply a service-role-backed PartialRefundLedgerRpcPort.
 * This module never reads the service-role secret from process.env and never
 * creates a browser/anon client. Production wiring belongs in server-only callers.
 */

import { PARTIAL_REFUND_LEDGER_RPCS } from "./rpcContracts";
import type {
  BeginStorePartialRefundLedgerRpcArgs,
  FailStorePartialRefundLedgerRpcArgs,
  PartialRefundLedgerRpcPort,
  PlanStorePartialRefundLedgerRpcArgs,
} from "./rpcContracts";

export type PartialRefundLedgerRpcInvoke = (
  fn: string,
  args: Record<string, unknown>
) => Promise<{ data: unknown; error: { message?: string } | null }>;

/**
 * Build a PartialRefundLedgerRpcPort from a narrow invoke function.
 * The invoke implementation must use service_role credentials exclusively.
 */
export function createPartialRefundLedgerRpcPort(
  invoke: PartialRefundLedgerRpcInvoke
): PartialRefundLedgerRpcPort {
  assertNotBrowser();

  return {
    async ensureCaptureAccounting(args) {
      return invokeRpc(invoke, PARTIAL_REFUND_LEDGER_RPCS.ensureCaptureAccounting, {
        p_store_id: args.storeId,
        p_order_id: args.orderId,
        p_payment_attempt_id: args.paymentAttemptId,
        p_capture_event_id: args.captureEventId,
        p_currency: args.currency,
        p_capture_amount_minor: args.captureAmountMinor,
      });
    },
    async plan(args: PlanStorePartialRefundLedgerRpcArgs) {
      return invokeRpc(invoke, PARTIAL_REFUND_LEDGER_RPCS.plan, {
        p_ledger_id: args.ledgerId,
        p_store_id: args.storeId,
        p_order_id: args.orderId,
        p_payment_attempt_id: args.paymentAttemptId,
        p_capture_event_id: args.captureEventId,
        p_currency: args.currency,
        p_capture_amount_minor: args.captureAmountMinor,
        p_refund_amount_minor: args.refundAmountMinor,
        p_calculation_fingerprint: args.calculationFingerprint,
        p_idempotency_key: args.idempotencyKey,
        p_expected_accounting_version: args.expectedAccountingVersion,
        p_lines: args.lines.map((l) => ({
          order_item_id: l.orderItemId,
          requested_quantity: l.requestedQuantity,
          refund_amount_minor: l.refundAmountMinor,
        })),
      });
    },
    async begin(args: BeginStorePartialRefundLedgerRpcArgs) {
      return invokeRpc(invoke, PARTIAL_REFUND_LEDGER_RPCS.begin, {
        p_ledger_id: args.ledgerId,
        p_purchased_quantity_by_line: args.purchasedQuantityByLineId,
      });
    },
    async complete(ledgerId: string) {
      return invokeRpc(invoke, PARTIAL_REFUND_LEDGER_RPCS.complete, {
        p_ledger_id: ledgerId,
      });
    },
    async fail(args: FailStorePartialRefundLedgerRpcArgs) {
      return invokeRpc(invoke, PARTIAL_REFUND_LEDGER_RPCS.fail, {
        p_ledger_id: args.ledgerId,
        p_failure_code: args.failureCode,
        p_failure_message_safe: args.failureMessageSafe,
      });
    },
    async getCaptureAccounting(captureEventId: string) {
      return invokeRpc(invoke, PARTIAL_REFUND_LEDGER_RPCS.getCaptureAccounting, {
        p_capture_event_id: captureEventId,
      });
    },
    async getCommit(ledgerId: string) {
      return invokeRpc(invoke, PARTIAL_REFUND_LEDGER_RPCS.getCommit, {
        p_ledger_id: ledgerId,
      });
    },
    async listCommitted(captureEventId: string) {
      return invokeRpc(invoke, PARTIAL_REFUND_LEDGER_RPCS.listCommitted, {
        p_capture_event_id: captureEventId,
      });
    },
    async listCommitting(args) {
      return invokeRpc(invoke, PARTIAL_REFUND_LEDGER_RPCS.listCommitting, {
        p_store_id: args.storeId ?? null,
        p_capture_event_id: args.captureEventId ?? null,
        p_limit: args.limit ?? 50,
      });
    },
    async compensateCommitted(args) {
      return invokeRpc(invoke, PARTIAL_REFUND_LEDGER_RPCS.compensateCommitted, {
        p_ledger_id: args.ledgerId,
        p_operator_reason: args.operatorReason,
        p_expected_store_id: args.expectedStoreId ?? null,
      });
    },
  };
}

async function invokeRpc(
  invoke: PartialRefundLedgerRpcInvoke,
  fn: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const { data, error } = await invoke(fn, args);
  if (error) {
    const err = new Error(error.message ?? "rpc_failed");
    (err as Error & { code?: string }).code = "rpc_transport";
    throw err;
  }
  return data;
}

export function assertNotBrowser(): void {
  if (typeof globalThis !== "undefined") {
    const g = globalThis as { window?: unknown; document?: unknown };
    if (typeof g.window !== "undefined" && typeof g.document !== "undefined") {
      throw new Error("browser_forbidden");
    }
  }
}

/** Marker used by static audits — never a credential. */
export const PARTIAL_REFUND_LEDGER_RPC_CLIENT_BOUNDARY =
  "commerce.payments.partial_refund_ledger_service_role_rpc_client_v1" as const;
