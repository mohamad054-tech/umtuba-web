/**
 * Commerce Commission Decomposition Bridge Apply V1.
 * Persist authoritative commission decomposition after trusted capture + allocate.
 * Server-only. Reuses Commission Policy Foundation roles/rounding. Fail closed.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export const COMMISSION_DECOMPOSITION_BRIDGE_APPLY_ID =
  "commerce.revenue.commission_decomposition_bridge_apply_v1" as const;

export const STORE_COMMISSION_DECOMPOSITION_APPLY_RPC =
  "apply_store_commission_decomposition_after_capture" as const;

export const STORE_COMMISSION_DECOMPOSITION_MARK_REFUND_RPC =
  "mark_store_commission_decomposition_after_refund" as const;

export const STORE_COMMISSION_DECOMPOSITION_GET_RPC =
  "get_store_commission_decomposition_for_attempt" as const;

type AnyClient = SupabaseClient;

export type CommissionDecompositionApplyResult =
  | {
      status: "applied";
      replayed: boolean;
      policyStatus: "applied";
      lifecycleStatus: string;
      basisMinor: number;
      captureAmountMinor: number;
      platformCommissionMinor: number;
      sellerAmountMinor: number;
      supplierAmountMinor: number;
      affiliateAmountMinor: number;
      partnerAmountMinor: number;
      calculationFingerprint: string;
      policyCode: string;
      policyVersion: number;
      data: Record<string, unknown>;
    }
  | {
      status: "not_configured";
      replayed: boolean;
      policyStatus: "not_configured";
      lifecycleStatus: string;
      captureAmountMinor: number;
      data: Record<string, unknown>;
    }
  | { status: "skipped"; reason: string }
  | { status: "failed"; message: string };

export type CommissionDecompositionRefundMarkResult =
  | {
      status: "marked";
      replayed: boolean;
      lifecycleStatus: string;
      data: Record<string, unknown>;
    }
  | { status: "skipped"; reason: string }
  | { status: "failed"; message: string };

/**
 * Deterministic commission apply event_key from trusted capture Sync event_key.
 */
export function buildCommissionDecompositionApplyEventKey(
  captureEventKey: string
): string {
  return `${captureEventKey.trim()}:commission`;
}

export async function applyCommissionDecompositionAfterTrustedCapture(
  supabase: AnyClient,
  input: {
    paymentAttemptId: string;
    captureEventKey: string;
    correlationId: string;
  }
): Promise<CommissionDecompositionApplyResult> {
  const eventKey = buildCommissionDecompositionApplyEventKey(
    input.captureEventKey
  );
  if (eventKey.length < 8 || eventKey.length > 160) {
    return {
      status: "failed",
      message: "Commission decomposition event_key length is invalid.",
    };
  }

  const { data, error } = await supabase.rpc(
    STORE_COMMISSION_DECOMPOSITION_APPLY_RPC,
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
        "Commission decomposition apply failed after trusted capture.",
    };
  }

  const payload = (data ?? {}) as Record<string, unknown>;
  const policyStatus = String(payload.policy_status ?? "");
  if (policyStatus === "not_configured") {
    return {
      status: "not_configured",
      replayed: Boolean(payload.replayed),
      policyStatus: "not_configured",
      lifecycleStatus: String(payload.lifecycle_status ?? "not_configured"),
      captureAmountMinor: Number(payload.capture_amount_minor ?? 0),
      data: payload,
    };
  }
  if (policyStatus !== "applied") {
    return {
      status: "failed",
      message: "Commission decomposition returned an unexpected policy_status.",
    };
  }

  return {
    status: "applied",
    replayed: Boolean(payload.replayed),
    policyStatus: "applied",
    lifecycleStatus: String(payload.lifecycle_status ?? "applied"),
    basisMinor: Number(payload.basis_minor ?? 0),
    captureAmountMinor: Number(payload.capture_amount_minor ?? 0),
    platformCommissionMinor: Number(payload.platform_commission_minor ?? 0),
    sellerAmountMinor: Number(payload.seller_amount_minor ?? 0),
    supplierAmountMinor: Number(payload.supplier_amount_minor ?? 0),
    affiliateAmountMinor: Number(payload.affiliate_amount_minor ?? 0),
    partnerAmountMinor: Number(payload.partner_amount_minor ?? 0),
    calculationFingerprint: String(payload.calculation_fingerprint ?? ""),
    policyCode: String(payload.policy_code ?? ""),
    policyVersion: Number(payload.policy_version ?? 0),
    data: payload,
  };
}

export async function markCommissionDecompositionAfterTrustedRefund(
  supabase: AnyClient,
  input: {
    paymentAttemptId: string;
    correlationId: string;
  }
): Promise<CommissionDecompositionRefundMarkResult> {
  const { data, error } = await supabase.rpc(
    STORE_COMMISSION_DECOMPOSITION_MARK_REFUND_RPC,
    {
      p_payment_attempt_id: input.paymentAttemptId,
      p_correlation_id: input.correlationId,
    }
  );

  if (error) {
    return {
      status: "failed",
      message:
        error.message?.trim() ||
        "Commission decomposition refund mark failed.",
    };
  }

  const payload = (data ?? {}) as Record<string, unknown>;
  if (Boolean(payload.skipped)) {
    return {
      status: "skipped",
      reason: String(
        payload.reason ?? "no_commission_decomposition_for_attempt"
      ),
    };
  }

  return {
    status: "marked",
    replayed: Boolean(payload.replayed),
    lifecycleStatus: String(
      payload.lifecycle_status ?? "superseded_by_refund"
    ),
    data: payload,
  };
}

export async function getCommissionDecompositionForAttempt(
  supabase: AnyClient,
  paymentAttemptId: string
): Promise<
  | { ok: true; found: false }
  | { ok: true; found: true; data: Record<string, unknown> }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc(
    STORE_COMMISSION_DECOMPOSITION_GET_RPC,
    { p_payment_attempt_id: paymentAttemptId }
  );
  if (error) {
    return {
      ok: false,
      message:
        error.message?.trim() ||
        "Unable to load commission decomposition for payment attempt.",
    };
  }
  const payload = (data ?? {}) as Record<string, unknown>;
  if (!Boolean(payload.found)) {
    return { ok: true, found: false };
  }
  return { ok: true, found: true, data: payload };
}
