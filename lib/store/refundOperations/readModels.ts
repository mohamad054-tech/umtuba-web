import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluateRefundOpsEligibility } from "./eligibility";
import {
  parseRefundOperationEvent,
  parseRefundOperationRequest,
  mapRpcError,
} from "./parse";
import type {
  RefundOperationEvent,
  RefundOperationRequest,
  RefundOpsSafeError,
} from "./types";
import { REFUND_OPERATIONS_VERSION } from "./types";

type AnyClient = SupabaseClient;

export type AdminRefundOperationsReadModel = {
  version: typeof REFUND_OPERATIONS_VERSION;
  requests: RefundOperationRequest[];
};

export type RefundOperationDetailReadModel = {
  version: typeof REFUND_OPERATIONS_VERSION;
  request: RefundOperationRequest;
  events: RefundOperationEvent[];
  eligibility: ReturnType<typeof evaluateRefundOpsEligibility> | null;
};

export type SellerRefundOperationsReadModel = {
  version: typeof REFUND_OPERATIONS_VERSION;
  storeId: string;
  orderId: string;
  requests: Array<{
    id: string;
    status: string;
    reason: string;
    rejectionReason: string | null;
    failureMessageSafe: string | null;
    trustedAmountMinor: number;
    currency: string;
    createdAt: string;
    updatedAt: string;
  }>;
  timeline: Array<{
    id: string;
    toStatus: string;
    fromStatus: string | null;
    note: string | null;
    createdAt: string;
    source: string;
  }>;
  canExecuteMoneyRefund: false;
};

function redactRequest(req: RefundOperationRequest) {
  return {
    id: req.id,
    status: req.status,
    reason: req.reason,
    rejectionReason: req.rejectionReason,
    failureMessageSafe: req.failureMessageSafe,
    trustedAmountMinor: req.trustedAmountMinor,
    currency: req.currency,
    createdAt: req.createdAt,
    updatedAt: req.updatedAt,
  };
}

export async function loadAdminRefundOperations(
  supabase: AnyClient,
  input?: { limit?: number; status?: string | null }
): Promise<AdminRefundOperationsReadModel | RefundOpsSafeError> {
  const { data, error } = await supabase.rpc(
    "admin_list_store_refund_operations",
    {
      p_limit: input?.limit ?? 50,
      p_status: input?.status ?? null,
    }
  );
  if (error) return mapRpcError(error.message ?? "List failed.");
  const rows =
    data && typeof data === "object"
      ? ((data as Record<string, unknown>).requests as unknown[])
      : [];
  const requests = (Array.isArray(rows) ? rows : [])
    .map((r) =>
      r && typeof r === "object"
        ? parseRefundOperationRequest(r as Record<string, unknown>)
        : null
    )
    .filter((r): r is RefundOperationRequest => r != null);

  return { version: REFUND_OPERATIONS_VERSION, requests };
}

export async function loadAdminRefundOperationDetail(
  supabase: AnyClient,
  requestId: string
): Promise<RefundOperationDetailReadModel | RefundOpsSafeError> {
  const { data, error } = await supabase.rpc(
    "admin_get_store_refund_operation",
    { p_request_id: requestId }
  );
  if (error) return mapRpcError(error.message ?? "Load failed.");
  if (!data || typeof data !== "object") {
    return { code: "rpc_failed", message: "Malformed detail response." };
  }
  const payload = data as Record<string, unknown>;
  const request = parseRefundOperationRequest(
    (payload.request ?? {}) as Record<string, unknown>
  );
  if (!request) {
    return { code: "not_found", message: "Refund request not found." };
  }
  const events = (Array.isArray(payload.events) ? payload.events : [])
    .map((e) =>
      e && typeof e === "object"
        ? parseRefundOperationEvent(e as Record<string, unknown>)
        : null
    )
    .filter((e): e is RefundOperationEvent => e != null);

  return {
    version: REFUND_OPERATIONS_VERSION,
    request,
    events,
    eligibility: null,
  };
}

export async function loadSellerRefundOperationsForOrder(
  supabase: AnyClient,
  input: { storeId: string; orderId: string }
): Promise<SellerRefundOperationsReadModel | RefundOpsSafeError> {
  const { data, error } = await supabase.rpc(
    "get_store_refund_operations_for_order",
    { p_order_id: input.orderId }
  );
  if (error) return mapRpcError(error.message ?? "Load failed.");
  if (!data || typeof data !== "object") {
    return { code: "rpc_failed", message: "Malformed order refund response." };
  }
  const payload = data as Record<string, unknown>;
  const requests = (Array.isArray(payload.requests) ? payload.requests : [])
    .map((r) =>
      r && typeof r === "object"
        ? parseRefundOperationRequest(r as Record<string, unknown>)
        : null
    )
    .filter((r): r is RefundOperationRequest => r != null)
    .filter((r) => r.storeId === input.storeId);

  const timeline = (Array.isArray(payload.events) ? payload.events : [])
    .map((e) =>
      e && typeof e === "object"
        ? parseRefundOperationEvent(e as Record<string, unknown>)
        : null
    )
    .filter((e): e is RefundOperationEvent => e != null)
    .filter((e) => e.storeId === input.storeId)
    .map((e) => ({
      id: e.id,
      toStatus: e.toStatus,
      fromStatus: e.fromStatus,
      note: e.note,
      createdAt: e.createdAt,
      source: e.source,
    }));

  return {
    version: REFUND_OPERATIONS_VERSION,
    storeId: input.storeId,
    orderId: input.orderId,
    requests: requests.map(redactRequest),
    timeline,
    canExecuteMoneyRefund: false,
  };
}
