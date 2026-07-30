/**
 * Service-role executor for apply_store_payment_outcome + optional post-capture allocate.
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
 * Apply a verified provider outcome via the existing Sync RPC exactly once
 * per event_key (DB-enforced replay). On trusted capture, also allocate once
 * via Settlement Foundation (idempotent event_key).
 *
 * `deps.supabase` is for server tests only — production callers omit it.
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
    return {
      ok: true,
      data: payload,
      replayed,
      settlement: {
        status: "skipped",
        reason: `Outcome ${input.outcome} is not settlement-allocate eligible.`,
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

  return {
    ok: true,
    data: payload,
    replayed,
    settlement,
  };
}
