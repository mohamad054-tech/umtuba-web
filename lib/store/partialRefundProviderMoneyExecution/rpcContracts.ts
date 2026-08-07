/**
 * RPC contracts for partial-refund provider execution persistence.
 */

export const PARTIAL_REFUND_PROVIDER_EXECUTION_RPCS = {
  claim: "service_claim_store_partial_refund_provider_execution",
  update: "service_update_store_partial_refund_provider_execution",
  getByLedger: "service_get_store_partial_refund_provider_execution_by_ledger",
  getByIdempotency:
    "service_get_store_partial_refund_provider_execution_by_idempotency",
  getById: "service_get_store_partial_refund_provider_execution",
  list: "service_list_store_partial_refund_provider_executions",
} as const;

export type PartialRefundProviderExecutionRpcInvoke = (
  fn: string,
  args: Record<string, unknown>
) => Promise<{ data: unknown; error: { message?: string } | null }>;

export type PartialRefundProviderExecutionRpcPort = {
  claim(args: Record<string, unknown>): Promise<unknown>;
  update(args: Record<string, unknown>): Promise<unknown>;
  getByLedger(ledgerId: string): Promise<unknown>;
  getByIdempotency(storeId: string, idempotencyKey: string): Promise<unknown>;
  getById(executionId: string): Promise<unknown>;
  list(args: {
    storeId?: string | null;
    status?: string | null;
    limit?: number;
  }): Promise<unknown>;
};

export function assertNotBrowserProviderMoney(): void {
  if (typeof window !== "undefined") {
    throw new Error("service_role_required");
  }
}

export function createPartialRefundProviderExecutionRpcPort(
  invoke: PartialRefundProviderExecutionRpcInvoke
): PartialRefundProviderExecutionRpcPort {
  assertNotBrowserProviderMoney();
  return {
    async claim(args) {
      return invokeRpc(invoke, PARTIAL_REFUND_PROVIDER_EXECUTION_RPCS.claim, args);
    },
    async update(args) {
      return invokeRpc(invoke, PARTIAL_REFUND_PROVIDER_EXECUTION_RPCS.update, args);
    },
    async getByLedger(ledgerId) {
      return invokeRpc(
        invoke,
        PARTIAL_REFUND_PROVIDER_EXECUTION_RPCS.getByLedger,
        { p_ledger_id: ledgerId }
      );
    },
    async getByIdempotency(storeId, idempotencyKey) {
      return invokeRpc(
        invoke,
        PARTIAL_REFUND_PROVIDER_EXECUTION_RPCS.getByIdempotency,
        { p_store_id: storeId, p_idempotency_key: idempotencyKey }
      );
    },
    async getById(executionId) {
      return invokeRpc(invoke, PARTIAL_REFUND_PROVIDER_EXECUTION_RPCS.getById, {
        p_execution_id: executionId,
      });
    },
    async list(args) {
      return invokeRpc(invoke, PARTIAL_REFUND_PROVIDER_EXECUTION_RPCS.list, {
        p_store_id: args.storeId ?? null,
        p_status: args.status ?? null,
        p_limit: args.limit ?? 50,
      });
    },
  };
}

async function invokeRpc(
  invoke: PartialRefundProviderExecutionRpcInvoke,
  fn: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const { data, error } = await invoke(fn, args);
  if (error) {
    throw new Error(error.message ?? "rpc_failed");
  }
  return data;
}

export function mapProviderExecutionRpcError(message: string): {
  code: string;
  message: string;
} {
  const raw = (message || "").toLowerCase();
  const codes = [
    "malformed_id",
    "malformed_idempotency_key",
    "zero_amount",
    "currency_mismatch",
    "provider_not_allowed",
    "unknown_refund",
    "missing_ownership",
    "invalid_state",
    "amount_mismatch",
    "duplicate_idempotency_key",
    "unknown_execution",
    "unsupported_transition",
  ] as const;
  for (const code of codes) {
    if (raw.includes(code)) {
      return { code, message: message.slice(0, 240) };
    }
  }
  return { code: "rpc_failed", message: message.slice(0, 240) || "RPC failed." };
}
