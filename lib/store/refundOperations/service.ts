import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import {
  applyFullOrderRefund,
  planFullOrderRefund,
  type TrustedFullOrderRefundContext,
} from "../fullOrderRefundPath";
import {
  wireCommerceRefundCompleted,
  wireCommerceRefundFailed,
  wireCommerceRefundRejected,
  wireCommerceRefundRequested,
} from "../commerceNotifications";
import { rejectClientRefundMoneyFields } from "./eligibility";
import { mapRpcError, parseRefundOperationRequest } from "./parse";
import type {
  RefundOperationRequest,
  RefundOpsSafeError,
} from "./types";

type AnyClient = SupabaseClient;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v: string): boolean {
  return UUID_RE.test(v.trim());
}

function validateIdempotencyKey(
  key: string
): { ok: true; key: string } | RefundOpsSafeError {
  const t = key.trim();
  if (t.length < 8 || t.length > 128) {
    return {
      code: "invalid_idempotency_key",
      message: "Idempotency key must be 8–128 characters.",
    };
  }
  return { ok: true, key: t };
}

function validateReason(
  reason: string
): { ok: true; reason: string } | RefundOpsSafeError {
  const t = reason.trim();
  if (t.length < 3 || t.length > 1000) {
    return { code: "invalid_reason", message: "A valid reason is required." };
  }
  return { ok: true, reason: t };
}

function requireServiceRole():
  | { ok: true; supabase: AnyClient }
  | RefundOpsSafeError {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return {
      code: "rpc_failed",
      message: "Refund execution is unavailable (server configuration).",
    };
  }
  return {
    ok: true,
    supabase: createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

function parseRequestPayload(
  data: unknown
):
  | { ok: true; request: RefundOperationRequest; replayed: boolean }
  | RefundOpsSafeError {
  if (!data || typeof data !== "object") {
    return { code: "rpc_failed", message: "Malformed refund RPC response." };
  }
  const row = data as Record<string, unknown>;
  if (row.ok === false) {
    return { code: "rpc_failed", message: "Refund RPC returned failure." };
  }
  const requestRaw = row.request;
  if (!requestRaw || typeof requestRaw !== "object") {
    return { code: "rpc_failed", message: "Refund request missing in response." };
  }
  const request = parseRefundOperationRequest(
    requestRaw as Record<string, unknown>
  );
  if (!request) {
    return { code: "rpc_failed", message: "Unable to parse refund request." };
  }
  return {
    ok: true,
    request,
    replayed: Boolean(row.replayed),
  };
}

export async function createRefundOperationRequest(
  supabase: AnyClient,
  input: {
    storeId: string;
    orderId: string;
    reason: string;
    idempotencyKey: string;
  }
): Promise<
  | { ok: true; request: RefundOperationRequest; replayed: boolean }
  | RefundOpsSafeError
> {
  const money = rejectClientRefundMoneyFields(
    input as unknown as Record<string, unknown>
  );
  if (!("ok" in money) || money.ok !== true) {
    return money as RefundOpsSafeError;
  }
  if (!isUuid(input.storeId) || !isUuid(input.orderId)) {
    return { code: "malformed_id", message: "Invalid store or order id." };
  }
  const reason = validateReason(input.reason);
  if (!("ok" in reason) || reason.ok !== true) return reason as RefundOpsSafeError;
  const idem = validateIdempotencyKey(input.idempotencyKey);
  if (!("ok" in idem) || idem.ok !== true) return idem as RefundOpsSafeError;

  const { data, error } = await supabase.rpc(
    "create_store_refund_operation_request",
    {
      p_store_id: input.storeId,
      p_order_id: input.orderId,
      p_reason: reason.reason,
      p_idempotency_key: idem.key,
    }
  );
  if (error) return mapRpcError(error.message ?? "Create failed.");
  const parsed = parseRequestPayload(data);
  if (!("ok" in parsed) || parsed.ok !== true) return parsed as RefundOpsSafeError;

  if (!parsed.replayed) {
    wireCommerceRefundRequested({
      orderId: parsed.request.orderId,
      storeId: parsed.request.storeId,
      paymentAttemptId: parsed.request.paymentAttemptId,
      buyerId: parsed.request.buyerUserId,
      sellerId: parsed.request.sellerUserId,
    });
  }

  return parsed;
}

export async function transitionRefundOperationRequest(
  supabase: AnyClient,
  input: {
    requestId: string;
    toStatus: "under_review" | "approved" | "rejected" | "cancelled";
    note?: string | null;
  }
): Promise<
  | { ok: true; request: RefundOperationRequest }
  | RefundOpsSafeError
> {
  if (!isUuid(input.requestId)) {
    return { code: "malformed_id", message: "Invalid request id." };
  }
  if (input.toStatus === "rejected") {
    const reason = validateReason(input.note ?? "");
    if (!("ok" in reason) || reason.ok !== true) return reason as RefundOpsSafeError;
  }

  const { data, error } = await supabase.rpc(
    "transition_store_refund_operation_request",
    {
      p_request_id: input.requestId,
      p_to_status: input.toStatus,
      p_note: input.note ?? null,
    }
  );
  if (error) return mapRpcError(error.message ?? "Transition failed.");
  const parsed = parseRequestPayload(data);
  if (!("ok" in parsed) || parsed.ok !== true) return parsed as RefundOpsSafeError;

  if (input.toStatus === "rejected") {
    wireCommerceRefundRejected({
      orderId: parsed.request.orderId,
      storeId: parsed.request.storeId,
      paymentAttemptId: parsed.request.paymentAttemptId,
      buyerId: parsed.request.buyerUserId,
      sellerId: parsed.request.sellerUserId,
      reason: parsed.request.rejectionReason,
    });
  }

  return { ok: true, request: parsed.request };
}

async function markExecution(
  supabase: AnyClient,
  input: {
    requestId: string;
    toStatus: "processing" | "completed" | "failed";
    executionIdempotencyKey?: string | null;
    failureCode?: string | null;
    failureMessageSafe?: string | null;
  }
): Promise<
  | { ok: true; request: RefundOperationRequest; replayed: boolean }
  | RefundOpsSafeError
> {
  const { data, error } = await supabase.rpc(
    "mark_store_refund_operation_execution",
    {
      p_request_id: input.requestId,
      p_to_status: input.toStatus,
      p_execution_idempotency_key: input.executionIdempotencyKey ?? null,
      p_failure_code: input.failureCode ?? null,
      p_failure_message_safe: input.failureMessageSafe ?? null,
    }
  );
  if (error) return mapRpcError(error.message ?? "Execution mark failed.");
  return parseRequestPayload(data);
}

/**
 * Admin/trusted execute: re-check eligibility via planner facts, then
 * applyFullOrderRefund, then durable status mark. Fail-closed.
 */
export async function executeRefundOperationRequest(
  userClient: AnyClient,
  input: {
    requestId: string;
    executionIdempotencyKey: string;
  },
  deps?: {
    applyRefund?: typeof applyFullOrderRefund;
    serviceClient?: AnyClient;
    loadRequest?: () => Promise<
      | { ok: true; request: RefundOperationRequest }
      | RefundOpsSafeError
    >;
    planContext?: TrustedFullOrderRefundContext;
  }
): Promise<
  | {
      ok: true;
      request: RefundOperationRequest;
      replayed: boolean;
      refundReplayed: boolean;
    }
  | RefundOpsSafeError
> {
  const money = rejectClientRefundMoneyFields(
    input as unknown as Record<string, unknown>
  );
  if (!("ok" in money) || money.ok !== true) {
    return money as RefundOpsSafeError;
  }
  if (!isUuid(input.requestId)) {
    return { code: "malformed_id", message: "Invalid request id." };
  }
  const execKey = validateIdempotencyKey(input.executionIdempotencyKey);
  if (!("ok" in execKey) || execKey.ok !== true) {
    return execKey as RefundOpsSafeError;
  }

  let request: RefundOperationRequest;
  if (deps?.loadRequest) {
    const loaded = await deps.loadRequest();
    if (!("ok" in loaded) || loaded.ok !== true) return loaded as RefundOpsSafeError;
    request = loaded.request;
  } else {
    const { data, error } = await userClient.rpc(
      "admin_get_store_refund_operation",
      { p_request_id: input.requestId }
    );
    if (error) return mapRpcError(error.message ?? "Load failed.");
    const parsed = parseRequestPayload(data);
    if (!("ok" in parsed) || parsed.ok !== true) return parsed as RefundOpsSafeError;
    request = parsed.request;
  }

  if (request.status !== "approved" && request.status !== "failed") {
    return {
      code: "illegal_transition",
      message: "Only approved (or failed retry) requests can be executed.",
    };
  }

  // Optional pure plan re-check when caller supplies trusted facts (tests).
  if (deps?.planContext) {
    const planned = planFullOrderRefund(deps.planContext);
    if (!planned.ok) {
      return {
        code: "not_refundable",
        message: planned.message,
      };
    }
  }

  const service =
    deps?.serviceClient != null
      ? { ok: true as const, supabase: deps.serviceClient }
      : requireServiceRole();
  if (!("ok" in service) || service.ok !== true) {
    return service as RefundOpsSafeError;
  }

  const processing = await markExecution(userClient, {
    requestId: request.id,
    toStatus: "processing",
    executionIdempotencyKey: execKey.key,
  });
  if (!("ok" in processing) || processing.ok !== true) {
    return processing as RefundOpsSafeError;
  }
  if (processing.replayed && processing.request.status === "completed") {
    return {
      ok: true,
      request: processing.request,
      replayed: true,
      refundReplayed: true,
    };
  }

  const apply = deps?.applyRefund ?? applyFullOrderRefund;
  const refundResult = await apply(service.supabase, {
    storeId: request.storeId,
    paymentAttemptId: request.paymentAttemptId,
    idempotencyKey: execKey.key,
    buyerId: request.buyerUserId,
    sellerId: request.sellerUserId,
  });

  if (!refundResult.ok) {
    const failed = await markExecution(userClient, {
      requestId: request.id,
      toStatus: "failed",
      executionIdempotencyKey: execKey.key,
      failureCode: refundResult.code,
      failureMessageSafe: refundResult.message.slice(0, 500),
    });
    wireCommerceRefundFailed({
      orderId: request.orderId,
      storeId: request.storeId,
      paymentAttemptId: request.paymentAttemptId,
      buyerId: request.buyerUserId,
      sellerId: request.sellerUserId,
      code: refundResult.code,
    });
    if (!("ok" in failed) || failed.ok !== true) {
      return {
        code: "execution_failed",
        message: refundResult.message.slice(0, 240),
      };
    }
    return {
      code: "execution_failed",
      message: failed.request.failureMessageSafe ?? "Refund execution failed.",
    };
  }

  const completed = await markExecution(userClient, {
    requestId: request.id,
    toStatus: "completed",
    executionIdempotencyKey: execKey.key,
  });
  if (!("ok" in completed) || completed.ok !== true) {
    return completed as RefundOpsSafeError;
  }

  // Ensure recipients are present even if path notify lacked IDs.
  wireCommerceRefundCompleted({
    orderId: request.orderId,
    storeId: request.storeId,
    paymentAttemptId: request.paymentAttemptId,
    buyerId: request.buyerUserId,
    sellerId: request.sellerUserId,
    correlationId: null,
  });

  return {
    ok: true,
    request: completed.request,
    replayed: completed.replayed,
    refundReplayed: refundResult.replayed,
  };
}
