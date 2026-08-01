/**
 * Commerce Digital Entitlement Revoke on Refund V1.
 * Server-side helpers to revoke digital access after trusted full-order refund.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export const DIGITAL_ENTITLEMENT_REVOKE_ID =
  "commerce.digital.entitlement_revoke_on_refund_v1" as const;

export const STORE_DIGITAL_ENTITLEMENT_REVOKE_RPC =
  "revoke_store_digital_entitlements_after_refund" as const;

export type DigitalEntitlementRevokeResult =
  | {
      status: "revoked";
      replayed: boolean;
      entitlementsRevoked: number;
      data: Record<string, unknown>;
    }
  | { status: "failed"; message: string };

type AnyClient = SupabaseClient;

/**
 * Deterministic revoke event key derived from the trusted capture event key.
 * One revoke ledger row per capture (independent of Sync refund idempotency key).
 */
export function buildDigitalEntitlementRevokeEventKey(
  captureEventKey: string
): string {
  return `${captureEventKey.trim()}:entitlement:revoke`;
}

export async function revokeDigitalEntitlementsAfterTrustedRefund(
  supabase: AnyClient,
  input: {
    paymentAttemptId: string;
    captureEventKey: string;
    correlationId: string;
  }
): Promise<DigitalEntitlementRevokeResult> {
  const eventKey = buildDigitalEntitlementRevokeEventKey(input.captureEventKey);
  if (eventKey.length < 8 || eventKey.length > 160) {
    return {
      status: "failed",
      message: "Digital entitlement revoke event_key length is invalid.",
    };
  }

  const { data, error } = await supabase.rpc(
    STORE_DIGITAL_ENTITLEMENT_REVOKE_RPC,
    {
      p_payment_attempt_id: input.paymentAttemptId,
      p_event_key: eventKey,
      p_correlation_id: input.correlationId,
    }
  );

  if (error) {
    return {
      status: "failed",
      message:
        error.message?.trim() ||
        "Digital entitlement revoke failed after trusted refund.",
    };
  }

  const payload = (data ?? {}) as Record<string, unknown>;
  return {
    status: "revoked",
    replayed: Boolean(payload.replayed),
    entitlementsRevoked: Number(payload.entitlements_revoked ?? 0),
    data: payload,
  };
}
