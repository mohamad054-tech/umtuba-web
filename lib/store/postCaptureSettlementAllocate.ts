/**
 * Commerce Post-Capture Settlement Allocate V1.
 * After a trusted Sync capture, allocate via existing Settlement Foundation RPC.
 * Server-only. Does not release, run bank transfers, or accept client money fields.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  STORE_SETTLEMENT_RPC,
  type StoreSettlementAction,
} from "./settlementFoundation";

export const POST_CAPTURE_SETTLEMENT_ALLOCATE_ID =
  "commerce.settlement.post_capture_allocate_v1" as const;

export const POST_CAPTURE_ALLOCATE_ACTION =
  "allocate" as const satisfies StoreSettlementAction;

type AnyClient = SupabaseClient;

export type PostCaptureAllocateResult =
  | {
      status: "allocated";
      replayed: boolean;
      data: Record<string, unknown>;
    }
  | { status: "skipped"; reason: string }
  | { status: "failed"; message: string };

/**
 * Deterministic allocate event_key from the trusted capture Sync event_key.
 * Matches Revenue Bridge pattern: `${captureEventKey}:allocate`.
 */
export function buildPostCaptureAllocateEventKey(
  captureEventKey: string
): string {
  const base = captureEventKey.trim();
  return `${base}:allocate`;
}

/**
 * Invoke apply_store_settlement_event(allocate) for a trusted captured attempt.
 * Amount/currency must already be server-derived (attempt/order). Correlation
 * must match the capture outcome event (Settlement Foundation contract).
 */
export async function allocateSettlementAfterTrustedCapture(
  supabase: AnyClient,
  input: {
    paymentAttemptId: string;
    correlationId: string;
    captureEventKey: string;
    amountMinor: number;
    currency: string;
    providerReference?: string;
  }
): Promise<PostCaptureAllocateResult> {
  if (
    typeof input.amountMinor !== "number" ||
    !Number.isInteger(input.amountMinor) ||
    input.amountMinor <= 0
  ) {
    return {
      status: "failed",
      message: "Settlement allocate requires a positive trusted amount.",
    };
  }
  const currency = String(input.currency ?? "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    return {
      status: "failed",
      message: "Settlement allocate requires a trusted ISO currency.",
    };
  }

  const eventKey = buildPostCaptureAllocateEventKey(input.captureEventKey);
  if (eventKey.length < 8 || eventKey.length > 128) {
    return {
      status: "failed",
      message: "Settlement allocate event_key length is invalid.",
    };
  }

  const metadata: Record<string, string> = {
    note: POST_CAPTURE_SETTLEMENT_ALLOCATE_ID,
    provider_event_type: "stripe.checkout.session.allocate",
  };
  if (input.providerReference?.trim()) {
    metadata.provider_payload_id = input.providerReference.trim();
  }

  const { data, error } = await supabase.rpc(STORE_SETTLEMENT_RPC, {
    p_action: POST_CAPTURE_ALLOCATE_ACTION,
    p_event_key: eventKey,
    p_correlation_id: input.correlationId,
    p_payment_attempt_id: input.paymentAttemptId,
    p_amount_minor: input.amountMinor,
    p_currency: currency,
    p_metadata: metadata,
  });

  if (error) {
    return {
      status: "failed",
      message:
        error.message?.trim() ||
        "Settlement allocate failed after trusted capture.",
    };
  }

  const payload = (data ?? {}) as Record<string, unknown>;
  return {
    status: "allocated",
    replayed: Boolean(payload.replayed),
    data: payload,
  };
}
