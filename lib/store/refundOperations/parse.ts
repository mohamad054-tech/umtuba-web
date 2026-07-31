import type {
  RefundOperationEvent,
  RefundOperationRequest,
  RefundOperationStatus,
} from "./types";
import { isRefundOperationStatus } from "./lifecycle";

function asString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return null;
}

export function parseRefundOperationRequest(
  raw: Record<string, unknown>
): RefundOperationRequest | null {
  const id = asString(raw.id);
  const storeId = asString(raw.store_id) ?? asString(raw.storeId);
  const orderId = asString(raw.order_id) ?? asString(raw.orderId);
  const paymentAttemptId =
    asString(raw.payment_attempt_id) ?? asString(raw.paymentAttemptId);
  const buyerUserId =
    asString(raw.buyer_user_id) ?? asString(raw.buyerUserId);
  const sellerUserId =
    asString(raw.seller_user_id) ?? asString(raw.sellerUserId);
  const requestedByUserId =
    asString(raw.requested_by_user_id) ?? asString(raw.requestedByUserId);
  const statusRaw = asString(raw.status);
  const reason = asString(raw.reason);
  const trustedAmountMinor =
    asNumber(raw.trusted_amount_minor) ?? asNumber(raw.trustedAmountMinor);
  const currency = asString(raw.currency);
  const idempotencyKey =
    asString(raw.idempotency_key) ?? asString(raw.idempotencyKey);
  const createdAt = asString(raw.created_at) ?? asString(raw.createdAt);
  const updatedAt = asString(raw.updated_at) ?? asString(raw.updatedAt);

  if (
    !id ||
    !storeId ||
    !orderId ||
    !paymentAttemptId ||
    !buyerUserId ||
    !sellerUserId ||
    !requestedByUserId ||
    !statusRaw ||
    !isRefundOperationStatus(statusRaw) ||
    !reason ||
    trustedAmountMinor == null ||
    trustedAmountMinor <= 0 ||
    !currency ||
    !idempotencyKey ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    id,
    storeId,
    orderId,
    paymentAttemptId,
    buyerUserId,
    sellerUserId,
    requestedByUserId,
    status: statusRaw as RefundOperationStatus,
    reason,
    rejectionReason:
      asString(raw.rejection_reason) ?? asString(raw.rejectionReason),
    failureCode: asString(raw.failure_code) ?? asString(raw.failureCode),
    failureMessageSafe:
      asString(raw.failure_message_safe) ??
      asString(raw.failureMessageSafe),
    trustedAmountMinor,
    currency: currency.toUpperCase(),
    idempotencyKey,
    executionIdempotencyKey:
      asString(raw.execution_idempotency_key) ??
      asString(raw.executionIdempotencyKey),
    reviewedByUserId:
      asString(raw.reviewed_by_user_id) ?? asString(raw.reviewedByUserId),
    reviewedAt: asString(raw.reviewed_at) ?? asString(raw.reviewedAt),
    executedByUserId:
      asString(raw.executed_by_user_id) ?? asString(raw.executedByUserId),
    executedAt: asString(raw.executed_at) ?? asString(raw.executedAt),
    completedAt: asString(raw.completed_at) ?? asString(raw.completedAt),
    createdAt,
    updatedAt,
  };
}

export function parseRefundOperationEvent(
  raw: Record<string, unknown>
): RefundOperationEvent | null {
  const id = asString(raw.id);
  const requestId = asString(raw.request_id) ?? asString(raw.requestId);
  const storeId = asString(raw.store_id) ?? asString(raw.storeId);
  const orderId = asString(raw.order_id) ?? asString(raw.orderId);
  const eventType = asString(raw.event_type) ?? asString(raw.eventType);
  const toStatus = asString(raw.to_status) ?? asString(raw.toStatus);
  const source = asString(raw.source);
  const createdAt = asString(raw.created_at) ?? asString(raw.createdAt);
  if (
    !id ||
    !requestId ||
    !storeId ||
    !orderId ||
    !eventType ||
    !toStatus ||
    !source ||
    !createdAt
  ) {
    return null;
  }
  if (
    source !== "buyer" &&
    source !== "seller" &&
    source !== "admin" &&
    source !== "system"
  ) {
    return null;
  }
  return {
    id,
    requestId,
    storeId,
    orderId,
    actorUserId: asString(raw.actor_user_id) ?? asString(raw.actorUserId),
    eventType,
    fromStatus: asString(raw.from_status) ?? asString(raw.fromStatus),
    toStatus,
    note: asString(raw.note),
    source,
    createdAt,
  };
}

export function mapRpcError(message: string): {
  code:
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
    | "rpc_failed";
  message: string;
} {
  const m = message.trim() || "Refund operation failed.";
  const lower = m.toLowerCase();
  if (lower.includes("not authorized") || lower.includes("platform admin")) {
    return { code: "unauthorized", message: "Not authorized." };
  }
  if (lower.includes("does not belong to store")) {
    return { code: "unauthorized_store", message: "Store ownership mismatch." };
  }
  if (lower.includes("not found")) {
    return { code: "not_found", message: "Refund request not found." };
  }
  if (lower.includes("already refunded") || lower.includes("payment already")) {
    return { code: "already_refunded", message: "Already refunded." };
  }
  if (lower.includes("active refund request")) {
    return {
      code: "duplicate_active_request",
      message: "An active refund request already exists for this order.",
    };
  }
  if (lower.includes("idempotency key conflict")) {
    return {
      code: "idempotency_conflict",
      message: "Idempotency key conflict.",
    };
  }
  if (lower.includes("illegal refund status")) {
    return { code: "illegal_transition", message: "Illegal status transition." };
  }
  if (lower.includes("invalid refund reason") || lower.includes("rejection reason")) {
    return { code: "invalid_reason", message: "A valid reason is required." };
  }
  if (lower.includes("invalid idempotency")) {
    return {
      code: "invalid_idempotency_key",
      message: "Invalid idempotency key.",
    };
  }
  if (lower.includes("not refundable") || lower.includes("captured payment")) {
    return { code: "not_refundable", message: "Order is not refundable." };
  }
  return { code: "rpc_failed", message: m.slice(0, 240) };
}
