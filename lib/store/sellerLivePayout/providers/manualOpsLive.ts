/**
 * Manual Ops Live provider (Slice S3).
 *
 * Implements the live payout provider port. Does NOT call any bank network API.
 * Initial success path is always attestation-pending — never "succeeded" on create.
 * Unusable unless the S1 production gate is satisfied.
 */

import { isSellerLivePayoutGateSatisfied } from "../gate";
import type { SellerLivePayoutProviderPort } from "../providerPort";
import {
  SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
  type SellerLivePayoutTransferInput,
  type SellerLivePayoutTransferResult,
} from "../types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function validateTransferInput(
  input: SellerLivePayoutTransferInput
): SellerLivePayoutTransferResult | null {
  if (
    !isUuid(input.storeId) ||
    !isUuid(input.captureEventId) ||
    !isUuid(input.executionId) ||
    !isUuid(input.destinationId)
  ) {
    return {
      status: "failed",
      providerRef: null,
      failureCode: "provider_rejected",
      note: "Manual Ops Live rejected transfer: invalid identifiers.",
    };
  }

  if (
    typeof input.amountMinor !== "number" ||
    !Number.isInteger(input.amountMinor) ||
    input.amountMinor <= 0
  ) {
    return {
      status: "failed",
      providerRef: null,
      failureCode: "invalid_amount",
      note: "Manual Ops Live rejected transfer: invalid trusted amount.",
    };
  }

  const currency =
    typeof input.currency === "string" ? input.currency.trim().toUpperCase() : "";
  if (!/^[A-Z]{3}$/.test(currency)) {
    return {
      status: "failed",
      providerRef: null,
      failureCode: "currency_mismatch",
      note: "Manual Ops Live rejected transfer: invalid currency.",
    };
  }

  const idem =
    typeof input.idempotencyKey === "string" ? input.idempotencyKey.trim() : "";
  if (idem.length < 8 || idem.length > 128) {
    return {
      status: "failed",
      providerRef: null,
      failureCode: "duplicate_request",
      note: "Manual Ops Live rejected transfer: invalid idempotency key.",
    };
  }

  return null;
}

/**
 * Build a non-secret provider reference for ops tracking.
 * Never embeds account numbers or secrets.
 */
export function buildManualOpsLiveProviderRef(
  executionId: string,
  idempotencyKey: string
): string {
  const execShort = executionId.replace(/-/g, "").slice(0, 8);
  const idemShort = idempotencyKey.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
  return `mol-${execShort}-${idemShort || "ref"}`;
}

async function createManualOpsLiveTransfer(
  input: SellerLivePayoutTransferInput,
  env: Record<string, string | undefined> = process.env
): Promise<SellerLivePayoutTransferResult> {
  // Gate is mandatory — provider stays unusable when OFF.
  if (!isSellerLivePayoutGateSatisfied(env)) {
    return {
      status: "failed",
      providerRef: null,
      failureCode: "gate_incomplete",
      note: "Manual Ops Live is unavailable until the live payout gate is satisfied.",
    };
  }

  const invalid = validateTransferInput(input);
  if (invalid) return invalid;

  // No bank network call. Durable-compatible initial outcome:
  // awaiting_attestation (transfer status: pending + attestation_required).
  const providerRef = buildManualOpsLiveProviderRef(
    input.executionId,
    input.idempotencyKey
  );

  return {
    status: "pending",
    providerRef,
    failureCode: "attestation_required",
    note:
      "Manual Ops Live: execution recorded for ops attestation. No bank transfer was initiated.",
  };
}

/**
 * Concrete Manual Ops Live port. Callers must obtain it via
 * `resolveSellerLivePayoutProviderPort` (gate-checked).
 */
export const manualOpsLiveProvider: SellerLivePayoutProviderPort = {
  providerId: SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
  supportsLiveTransfer: true,
  createTransfer(input) {
    return createManualOpsLiveTransfer(input);
  },
  // Manual Ops has no provider webhooks in V1.
  async parseWebhook() {
    return null;
  },
};

/**
 * Test/fixture helper — evaluate createTransfer against an explicit env map.
 */
export function createManualOpsLiveTransferForTests(
  input: SellerLivePayoutTransferInput,
  env: Record<string, string | undefined>
): Promise<SellerLivePayoutTransferResult> {
  return createManualOpsLiveTransfer(input, env);
}

export function getManualOpsLiveProvider(): SellerLivePayoutProviderPort {
  return manualOpsLiveProvider;
}
