/**
 * Seller Live Payout Provider Port V1 (Slice S1 + S3 resolve).
 *
 * Contracts + gated resolve. Ungated external provider ids remain forbidden.
 * Concrete Manual Ops Live adapter lives in providers/manualOpsLive.ts (S3).
 */

import { isSellerLivePayoutGateSatisfied } from "./gate";
import { getManualOpsLiveProvider } from "./providers/manualOpsLive";
import type {
  SellerLivePayoutProviderId,
  SellerLivePayoutTransferInput,
  SellerLivePayoutTransferResult,
} from "./types";
import { SELLER_LIVE_PAYOUT_V1_PROVIDER_ID } from "./types";

/**
 * Provider capability contract (static). Does not perform I/O.
 */
export type SellerLivePayoutProviderContract = {
  providerId: SellerLivePayoutProviderId;
  displayName: string;
  /** True only for the V1 live provider that may run behind the production gate. */
  supportsLiveTransfer: boolean;
  /** True when V1 may select this provider once the gate is satisfied. */
  enabledForV1: boolean;
  notes: string;
};

export const SELLER_LIVE_PAYOUT_PROVIDER_CONTRACTS: SellerLivePayoutProviderContract[] =
  [
    {
      providerId: "manual_ops_live",
      displayName: "Manual Ops Live Clearing",
      supportsLiveTransfer: true,
      enabledForV1: true,
      notes:
        "V1 live rail. Ops attestation after ledger submit; no bank API.",
    },
    {
      providerId: "stripe_connect",
      displayName: "Stripe Connect (reserved)",
      supportsLiveTransfer: true,
      enabledForV1: false,
      notes:
        "Reserved for a later slice. Forbidden until a gated Connect adapter ships.",
    },
  ];

/**
 * Runtime port — Manual Ops Live (S3). Stripe Connect remains reserved.
 */
export type SellerLivePayoutProviderPort = {
  readonly providerId: SellerLivePayoutProviderId;
  readonly supportsLiveTransfer: true;
  createTransfer(
    input: SellerLivePayoutTransferInput
  ): Promise<SellerLivePayoutTransferResult>;
  parseWebhook?(
    payload: unknown
  ): Promise<SellerLivePayoutTransferResult | null>;
};

export function getSellerLivePayoutProviderContract(
  providerId: string
): SellerLivePayoutProviderContract | null {
  return (
    SELLER_LIVE_PAYOUT_PROVIDER_CONTRACTS.find(
      (p) => p.providerId === providerId
    ) ?? null
  );
}

/**
 * Fail-closed: reject unknown providers and any id that looks like an
 * ungated external rail. V1 live execution is allowed only for
 * `manual_ops_live` (gated Manual Ops Live adapter in S3).
 */
export function assertSellerLivePayoutProviderAllowed(
  providerId: string
): void {
  const normalized = providerId.trim().toLowerCase();
  if (
    normalized.includes("wise") ||
    normalized.includes("paypal") ||
    normalized === "stripe_connect" ||
    normalized.includes("stripe")
  ) {
    throw new Error(
      "External live payout provider is forbidden until a gated adapter is enabled."
    );
  }

  const contract = getSellerLivePayoutProviderContract(providerId);
  if (!contract || !contract.enabledForV1 || !contract.supportsLiveTransfer) {
    throw new Error("Live payout provider is not allowed for V1.");
  }

  if (providerId !== SELLER_LIVE_PAYOUT_V1_PROVIDER_ID) {
    throw new Error("Live payout provider is not allowed for V1.");
  }
}

/**
 * Resolve a concrete live provider port.
 * Fail-closed: returns null unless the S1 gate is satisfied and the id is
 * the V1 Manual Ops Live provider. Stripe Connect / Wise / PayPal stay forbidden.
 */
export function resolveSellerLivePayoutProviderPort(
  providerId: string,
  env: Record<string, string | undefined> = process.env
): SellerLivePayoutProviderPort | null {
  assertSellerLivePayoutProviderAllowed(providerId);
  if (!isSellerLivePayoutGateSatisfied(env)) {
    return null;
  }
  if (providerId !== SELLER_LIVE_PAYOUT_V1_PROVIDER_ID) {
    return null;
  }
  return getManualOpsLiveProvider();
}
