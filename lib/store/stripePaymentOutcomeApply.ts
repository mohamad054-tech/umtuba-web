/**
 * Service-role executor for apply_store_payment_outcome + allocate +
 * entitlement grant + settlement release.
 * Server-only module (API routes / workers). Never import from client components.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  STORE_PAYMENT_SYNC_RPC,
  type StorePaymentOutcome,
} from "./paymentOutcomeSync";
import {
  allocateSettlementAfterTrustedCapture,
  type PostCaptureAllocateResult,
} from "./postCaptureSettlementAllocate";
import {
  grantDigitalEntitlementsAfterTrustedCapture,
  type DigitalEntitlementGrantResult,
} from "./digitalEntitlementGrant";
import {
  releaseSettlementAfterTrustedFulfillment,
  type PostCaptureReleaseResult,
} from "./postCaptureSettlementRelease";
import { wireCommercePaymentOutcome } from "./commerceNotifications";

export type ApplyStorePaymentOutcomeInput = {
  paymentAttemptId: string;
  outcome: StorePaymentOutcome;
  eventKey: string;
  correlationId: string;
  providerReference: string;
  amountMinor: number;
  currency: string;
  metadata?: Record<string, unknown>;
};

export type ApplyStorePaymentOutcomeResult =
  | {
      ok: true;
      data: Record<string, unknown>;
      replayed: boolean;
      settlement: PostCaptureAllocateResult;
      entitlement: DigitalEntitlementGrantResult;
      release: PostCaptureReleaseResult;
    }
  | { ok: false; message: string };

function requireServiceRoleEnv():
  | { ok: true; url: string; key: string }
  | { ok: false; message: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return {
      ok: false,
      message: "Payment settlement is unavailable (server configuration).",
    };
  }
  return { ok: true, url, key };
}

function serviceRoleClient():
  | { ok: true; supabase: SupabaseClient }
  | { ok: false; message: string } {
  const env = requireServiceRoleEnv();
  if (!env.ok) return env;
  return {
    ok: true,
    supabase: createClient(env.url, env.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

/**
 * Apply verified provider outcome via Sync. On capture: allocate, grant
 * digital entitlements, then release to payable. Post-steps are idempotent.
 * Release runs only after both allocate and entitlement succeed.
 */
export async function applyVerifiedStorePaymentOutcome(
  input: ApplyStorePaymentOutcomeInput,
  deps?: { supabase?: SupabaseClient }
): Promise<ApplyStorePaymentOutcomeResult> {
  const client = deps?.supabase
    ? { ok: true as const, supabase: deps.supabase }
    : serviceRoleClient();
  if (!client.ok) return client;
  const { supabase } = client;

  const { data, error } = await supabase.rpc(STORE_PAYMENT_SYNC_RPC, {
    p_payment_attempt_id: input.paymentAttemptId,
    p_outcome: input.outcome,
    p_event_key: input.eventKey,
    p_correlation_id: input.correlationId,
    p_provider_reference: input.providerReference,
    p_amount_minor: input.amountMinor,
    p_currency: input.currency,
    p_metadata: {
      provider_event_type: "stripe.checkout.session",
      provider_payload_id: input.providerReference,
      note: "commerce.payments.live_capture_adapter_v1",
      ...(input.metadata ?? {}),
    },
  });

  if (error) {
    return {
      ok: false,
      message: error.message?.trim() || "Unable to apply payment outcome.",
    };
  }

  const payload = (data ?? {}) as Record<string, unknown>;
  const replayed = Boolean(payload.replayed);

  if (input.outcome !== "captured") {
    wireCommercePaymentOutcome({
      outcome: input.outcome,
      paymentAttemptId: input.paymentAttemptId,
      correlationId: input.correlationId,
      payload,
    });
    return {
      ok: true,
      data: payload,
      replayed,
      settlement: {
        status: "skipped",
        reason: `Outcome ${input.outcome} is not settlement-allocate eligible.`,
      },
      entitlement: {
        status: "skipped",
        reason: `Outcome ${input.outcome} is not entitlement-grant eligible.`,
      },
      release: {
        status: "skipped",
        reason: `Outcome ${input.outcome} is not settlement-release eligible.`,
      },
    };
  }

  const settlement = await allocateSettlementAfterTrustedCapture(supabase, {
    paymentAttemptId: input.paymentAttemptId,
    correlationId: input.correlationId,
    captureEventKey: input.eventKey,
    amountMinor: input.amountMinor,
    currency: input.currency,
    providerReference: input.providerReference,
  });

  const entitlement = await grantDigitalEntitlementsAfterTrustedCapture(
    supabase,
    {
      paymentAttemptId: input.paymentAttemptId,
      captureEventKey: input.eventKey,
      correlationId: input.correlationId,
    }
  );

  let release: PostCaptureReleaseResult;
  if (settlement.status !== "allocated") {
    release = {
      status: "skipped",
      reason:
        settlement.status === "failed"
          ? "Settlement release skipped because allocate failed."
          : "Settlement release skipped because allocate did not succeed.",
    };
  } else if (entitlement.status !== "granted") {
    release = {
      status: "skipped",
      reason:
        entitlement.status === "failed"
          ? "Settlement release skipped because entitlement grant failed."
          : "Settlement release skipped because entitlement grant did not succeed.",
    };
  } else {
    release = await releaseSettlementAfterTrustedFulfillment(supabase, {
      paymentAttemptId: input.paymentAttemptId,
      correlationId: input.correlationId,
      captureEventKey: input.eventKey,
      amountMinor: input.amountMinor,
      currency: input.currency,
      providerReference: input.providerReference,
    });
  }

  wireCommercePaymentOutcome({
    outcome: input.outcome,
    paymentAttemptId: input.paymentAttemptId,
    correlationId: input.correlationId,
    payload,
    entitlementGranted: entitlement.status === "granted",
  });

  return {
    ok: true,
    data: payload,
    replayed,
    settlement,
    entitlement,
    release,
  };
}
