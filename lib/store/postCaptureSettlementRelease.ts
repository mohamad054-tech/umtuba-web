/**
 * Commerce Post-Capture Settlement Release V1.
 * After trusted Sync capture + allocate + digital entitlement grant, release
 * via existing Settlement Foundation RPC (escrow → payable).
 * Server-only. Does not initiate seller bank disbursements or accept client money fields.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  STORE_SETTLEMENT_RPC,
  type StoreSettlementAction,
} from "./settlementFoundation";

export const POST_CAPTURE_SETTLEMENT_RELEASE_ID =
  "commerce.settlement.post_capture_release_v1" as const;

export const POST_CAPTURE_RELEASE_ACTION =
  "release" as const satisfies StoreSettlementAction;

type AnyClient = SupabaseClient;

export type PostCaptureReleaseResult =
  | {
      status: "released";
      replayed: boolean;
      data: Record<string, unknown>;
    }
  | { status: "skipped"; reason: string }
  | { status: "failed"; message: string };

/**
 * Deterministic release event_key from the trusted capture Sync event_key.
 * Parallel to allocate (`:allocate`) and entitlement (`:entitlement`).
 */
export function buildPostCaptureReleaseEventKey(
  captureEventKey: string
): string {
  const base = captureEventKey.trim();
  return `${base}:release`;
}

/**
 * Invoke apply_store_settlement_event(release) for a trusted captured attempt
 * that already allocated and completed digital entitlement grant.
 * Amount/currency must already be server-derived (attempt/order). Correlation
 * must match the capture outcome event (Settlement Foundation contract).
 */
export async function releaseSettlementAfterTrustedFulfillment(
  supabase: AnyClient,
  input: {
    paymentAttemptId: string;
    correlationId: string;
    captureEventKey: string;
    amountMinor: number;
    currency: string;
    providerReference?: string;
  }
): Promise<PostCaptureReleaseResult> {
  if (
    typeof input.amountMinor !== "number" ||
    !Number.isInteger(input.amountMinor) ||
    input.amountMinor <= 0
  ) {
    return {
      status: "failed",
      message: "Settlement release requires a positive trusted amount.",
    };
  }
  const currency = String(input.currency ?? "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    return {
      status: "failed",
      message: "Settlement release requires a trusted ISO currency.",
    };
  }

  const eventKey = buildPostCaptureReleaseEventKey(input.captureEventKey);
  if (eventKey.length < 8 || eventKey.length > 128) {
    return {
      status: "failed",
      message: "Settlement release event_key length is invalid.",
    };
  }

  const metadata: Record<string, string> = {
    note: POST_CAPTURE_SETTLEMENT_RELEASE_ID,
    provider_event_type: "stripe.checkout.session.release",
  };
  if (input.providerReference?.trim()) {
    metadata.provider_payload_id = input.providerReference.trim();
  }

  const { data, error } = await supabase.rpc(STORE_SETTLEMENT_RPC, {
    p_action: POST_CAPTURE_RELEASE_ACTION,
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
        "Settlement release failed after trusted fulfillment.",
    };
  }

  const payload = (data ?? {}) as Record<string, unknown>;
  return {
    status: "released",
    replayed: Boolean(payload.replayed),
    data: payload,
  };
}
