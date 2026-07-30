/**
 * Service-role executor for apply_store_payment_outcome.
 * Server-only module (API routes / workers). Never import from client components.
 */

import { createClient } from "@supabase/supabase-js";
import {
  STORE_PAYMENT_SYNC_RPC,
  type StorePaymentOutcome,
} from "./paymentOutcomeSync";

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
  | { ok: true; data: Record<string, unknown>; replayed: boolean }
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

/**
 * Apply a verified provider outcome via the existing Sync RPC exactly once
 * per event_key (DB-enforced replay).
 */
export async function applyVerifiedStorePaymentOutcome(
  input: ApplyStorePaymentOutcomeInput
): Promise<ApplyStorePaymentOutcomeResult> {
  const env = requireServiceRoleEnv();
  if (!env.ok) return env;

  const supabase = createClient(env.url, env.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

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
  return {
    ok: true,
    data: payload,
    replayed: Boolean(payload.replayed),
  };
}
