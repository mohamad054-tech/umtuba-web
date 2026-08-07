/**
 * Narrow provider port for partial refund money execution.
 * Distinguishes confirmed success, confirmed failure, and uncertain outcomes.
 */

export type PartialRefundProviderSubmitInput = {
  providerPaymentRef: string;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
};

export type PartialRefundProviderLookupInput = {
  providerRefundId?: string | null;
  /** Optional PaymentIntent for context; not used as money source. */
  providerPaymentRef?: string | null;
  idempotencyKey: string;
};

export type PartialRefundProviderOutcome =
  | {
      kind: "succeeded";
      providerRefundId: string;
      providerStatusSafe: string;
      amountMinor: number;
      currency: string;
    }
  | {
      kind: "failed";
      failureCode: string;
      failureMessageSafe: string;
      providerStatusSafe?: string | null;
      providerRefundId?: string | null;
    }
  | {
      kind: "uncertain";
      failureCode: string;
      failureMessageSafe: string;
      providerRefundId?: string | null;
      providerStatusSafe?: string | null;
    };

export type PartialRefundProviderPort = {
  readonly providerKind: "stripe";
  submitPartialRefund(
    input: PartialRefundProviderSubmitInput
  ): Promise<PartialRefundProviderOutcome>;
  /**
   * Lookup / recover outcome. Must not mint a new idempotency key.
   * May re-issue the same Stripe Idempotency-Key only as safe recovery semantics.
   */
  lookupPartialRefund(
    input: PartialRefundProviderLookupInput
  ): Promise<PartialRefundProviderOutcome>;
};
