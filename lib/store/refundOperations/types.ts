/**
 * Commerce Refund Operations Surface V1 — workflow contracts.
 * Money execution stays in fullOrderRefundPath (full-order only).
 */

export const REFUND_OPERATIONS_VERSION =
  "commerce-refund-operations-surface-v1" as const;

export const REFUND_OPERATION_STATUSES = [
  "requested",
  "under_review",
  "approved",
  "rejected",
  "processing",
  "completed",
  "failed",
  "cancelled",
] as const;

export type RefundOperationStatus = (typeof REFUND_OPERATION_STATUSES)[number];

export const REFUND_OPERATION_TERMINAL_STATUSES = [
  "rejected",
  "completed",
  "cancelled",
] as const;

export const REFUND_OPERATION_ACTIVE_STATUSES = [
  "requested",
  "under_review",
  "approved",
  "processing",
] as const;

export type RefundOpsFailureCode =
  | "malformed_id"
  | "unauthorized"
  | "unauthorized_store"
  | "not_found"
  | "not_refundable"
  | "already_refunded"
  | "duplicate_active_request"
  | "idempotency_conflict"
  | "illegal_transition"
  | "invalid_reason"
  | "invalid_idempotency_key"
  | "client_money_rejected"
  | "execution_failed"
  | "rpc_failed";

export type RefundOpsSafeError = {
  code: RefundOpsFailureCode;
  message: string;
};

export type RefundOperationRequest = {
  id: string;
  storeId: string;
  orderId: string;
  paymentAttemptId: string;
  buyerUserId: string;
  sellerUserId: string;
  requestedByUserId: string;
  status: RefundOperationStatus;
  reason: string;
  rejectionReason: string | null;
  failureCode: string | null;
  failureMessageSafe: string | null;
  trustedAmountMinor: number;
  currency: string;
  idempotencyKey: string;
  executionIdempotencyKey: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  executedByUserId: string | null;
  executedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RefundOperationEvent = {
  id: string;
  requestId: string;
  storeId: string;
  orderId: string;
  actorUserId: string | null;
  eventType: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  source: "buyer" | "seller" | "admin" | "system";
  createdAt: string;
};

export const REFUND_OPS_RPCS = [
  "create_store_refund_operation_request",
  "transition_store_refund_operation_request",
  "mark_store_refund_operation_execution",
  "admin_list_store_refund_operations",
  "admin_get_store_refund_operation",
  "get_store_refund_operations_for_order",
  "store_refund_ops_transition_allowed",
] as const;

export type RefundOpsRpc = (typeof REFUND_OPS_RPCS)[number];
