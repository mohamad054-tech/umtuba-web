/**
 * Stripe partial-refund adapter — uses stripeApi + stripeConfig.
 * Network/timeout/malformed → uncertain. Confirmed Stripe errors → failed.
 * Never logs secrets.
 */

import {
  createStripeRefund,
  retrieveStripeRefund,
  type StripeRefund,
} from "../stripeApi";
import {
  evaluateStripeLiveCaptureConfigForTests,
  type StripeLiveCaptureConfig,
} from "../stripeConfig";
import type {
  PartialRefundProviderLookupInput,
  PartialRefundProviderOutcome,
  PartialRefundProviderPort,
  PartialRefundProviderSubmitInput,
} from "./providerPort";
import { isStripePaymentIntentRef, normalizeCurrency } from "./validate";

function paymentIntentIdFromRefund(refund: StripeRefund): string | null {
  const pi = refund.payment_intent;
  if (typeof pi === "string" && pi.startsWith("pi_")) return pi;
  if (pi && typeof pi === "object" && typeof pi.id === "string") return pi.id;
  return null;
}

function mapSucceeded(refund: StripeRefund): PartialRefundProviderOutcome {
  const currency = normalizeCurrency(refund.currency);
  if (
    !refund.id ||
    !Number.isInteger(refund.amount) ||
    refund.amount <= 0 ||
    !currency
  ) {
    return {
      kind: "uncertain",
      failureCode: "malformed_provider_response",
      failureMessageSafe: "Stripe refund response missing required fields.",
      providerRefundId: typeof refund.id === "string" ? refund.id : null,
      providerStatusSafe:
        typeof refund.status === "string" ? refund.status.slice(0, 80) : null,
    };
  }

  const status = String(refund.status ?? "").toLowerCase();
  if (status === "succeeded") {
    return {
      kind: "succeeded",
      providerRefundId: refund.id,
      providerStatusSafe: status.slice(0, 80),
      amountMinor: refund.amount,
      currency,
    };
  }
  if (status === "failed" || status === "canceled" || status === "cancelled") {
    return {
      kind: "failed",
      failureCode: "provider_rejected",
      failureMessageSafe: `Stripe refund status ${status}.`,
      providerStatusSafe: status.slice(0, 80),
      providerRefundId: refund.id,
    };
  }
  // pending / unknown → uncertain (do not auto-fail or compensate)
  return {
    kind: "uncertain",
    failureCode: "unknown_provider_status",
    failureMessageSafe:
      status === "pending"
        ? "Stripe refund is pending; recovery lookup required."
        : "Stripe refund status is ambiguous.",
    providerRefundId: refund.id,
    providerStatusSafe: status.slice(0, 80) || null,
  };
}

function validateSubmitInput(
  input: PartialRefundProviderSubmitInput
): PartialRefundProviderOutcome | null {
  if (!isStripePaymentIntentRef(input.providerPaymentRef)) {
    return {
      kind: "failed",
      failureCode: "missing_provider_payment_ref",
      failureMessageSafe:
        "Authoritative Stripe PaymentIntent reference is missing or invalid.",
    };
  }
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
    return {
      kind: "failed",
      failureCode: "zero_amount",
      failureMessageSafe: "Refund amount must be a positive integer.",
    };
  }
  const currency = normalizeCurrency(input.currency);
  if (!currency) {
    return {
      kind: "failed",
      failureCode: "currency_mismatch",
      failureMessageSafe: "Currency must be a 3-letter ISO code.",
    };
  }
  if (
    input.idempotencyKey.trim().length < 8 ||
    input.idempotencyKey.trim().length > 128
  ) {
    return {
      kind: "failed",
      failureCode: "malformed_idempotency_key",
      failureMessageSafe: "Idempotency key length invalid.",
    };
  }
  return null;
}

export type StripePartialRefundAdapterDeps = {
  env?: Record<string, string | undefined>;
  getConfig?: (
    env: Record<string, string | undefined>
  ) => StripeLiveCaptureConfig;
  createRefund?: typeof createStripeRefund;
  retrieveRefund?: typeof retrieveStripeRefund;
};

export function createStripePartialRefundProviderPort(
  deps: StripePartialRefundAdapterDeps = {}
): PartialRefundProviderPort {
  const env = deps.env ?? process.env;
  const getConfig =
    deps.getConfig ?? evaluateStripeLiveCaptureConfigForTests;
  const createRefund = deps.createRefund ?? createStripeRefund;
  const retrieveRefund = deps.retrieveRefund ?? retrieveStripeRefund;

  return {
    providerKind: "stripe",

    async submitPartialRefund(
      input: PartialRefundProviderSubmitInput
    ): Promise<PartialRefundProviderOutcome> {
      const invalid = validateSubmitInput(input);
      if (invalid) return invalid;

      const config = getConfig(env);
      if (!config.ok) {
        return {
          kind: "failed",
          failureCode: "stripe_config_unavailable",
          failureMessageSafe: config.message.slice(0, 500),
        };
      }

      const currency = normalizeCurrency(input.currency)!;
      let result;
      try {
        result = await createRefund(config.secretKey, {
          paymentIntentId: input.providerPaymentRef.trim(),
          amountMinor: input.amountMinor,
          currency,
          idempotencyKey: input.idempotencyKey.trim(),
          reason: "requested_by_customer",
        });
      } catch {
        return {
          kind: "uncertain",
          failureCode: "network_error",
          failureMessageSafe: "Unable to reach Stripe for refund create.",
        };
      }

      if (!result.ok) {
        // Transport / ambiguous HTTP → uncertain; definitive 4xx with message → failed
        if (result.status == null) {
          return {
            kind: "uncertain",
            failureCode: "network_error",
            failureMessageSafe: result.message.slice(0, 500),
          };
        }
        if (result.status >= 500) {
          return {
            kind: "uncertain",
            failureCode: "provider_5xx",
            failureMessageSafe: result.message.slice(0, 500),
          };
        }
        if (result.status === 409 || result.status === 429) {
          return {
            kind: "uncertain",
            failureCode: "provider_conflict_or_rate_limit",
            failureMessageSafe: result.message.slice(0, 500),
          };
        }
        return {
          kind: "failed",
          failureCode: "provider_rejected",
          failureMessageSafe: result.message.slice(0, 500),
        };
      }

      return mapSucceeded(result.data);
    },

    async lookupPartialRefund(
      input: PartialRefundProviderLookupInput
    ): Promise<PartialRefundProviderOutcome> {
      const config = getConfig(env);
      if (!config.ok) {
        return {
          kind: "failed",
          failureCode: "stripe_config_unavailable",
          failureMessageSafe: config.message.slice(0, 500),
        };
      }

      const refundId = input.providerRefundId?.trim() || null;
      if (refundId && /^re_[A-Za-z0-9]+$/.test(refundId)) {
        let result;
        try {
          result = await retrieveRefund(config.secretKey, refundId);
        } catch {
          return {
            kind: "uncertain",
            failureCode: "network_error",
            failureMessageSafe: "Unable to reach Stripe for refund retrieve.",
            providerRefundId: refundId,
          };
        }
        if (!result.ok) {
          if (result.status == null || result.status >= 500) {
            return {
              kind: "uncertain",
              failureCode: "network_error",
              failureMessageSafe: result.message.slice(0, 500),
              providerRefundId: refundId,
            };
          }
          if (result.status === 404) {
            return {
              kind: "failed",
              failureCode: "provider_refund_not_found",
              failureMessageSafe: "Stripe refund not found.",
              providerRefundId: refundId,
            };
          }
          return {
            kind: "uncertain",
            failureCode: "provider_lookup_ambiguous",
            failureMessageSafe: result.message.slice(0, 500),
            providerRefundId: refundId,
          };
        }
        void paymentIntentIdFromRefund;
        return mapSucceeded(result.data);
      }

      // Without a refund id, P1 does not blindly re-POST. Recovery stays uncertain.
      return {
        kind: "uncertain",
        failureCode: "lookup_requires_provider_refund_id",
        failureMessageSafe:
          "Recovery lookup requires a stored provider refund id in P1.",
      };
    },
  };
}
