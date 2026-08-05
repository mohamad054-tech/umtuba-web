"use client";

/**
 * Seller Request Payout control (Slice S7).
 * Calls requestSellerLivePayoutAction only — identifiers, never client money.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestSellerLivePayoutAction } from "../../actions/storeSellerLivePayout";
import type { SellerLivePayoutRequestCandidateView } from "../../../lib/store/sellerPayoutEligibilitySurface";

export type SellerPayoutRequestButtonProps = {
  storeId: string;
  destinationId: string | null;
  candidates: SellerLivePayoutRequestCandidateView[];
  requestAllowed: boolean;
  blockReason: string | null;
  inTransitCaptureCount: number;
};

function newOrchestrationKey(paymentAttemptId: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now()}${Math.random().toString(16).slice(2)}`;
  return `live-${paymentAttemptId.slice(0, 8)}-${rand}`.slice(0, 120);
}

export default function SellerPayoutRequestButton({
  storeId,
  destinationId,
  candidates,
  requestAllowed,
  blockReason,
  inTransitCaptureCount,
}: SellerPayoutRequestButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function requestFor(candidate: SellerLivePayoutRequestCandidateView) {
    if (!requestAllowed || pending || !destinationId) return;
    if (candidate.payoutStatus !== "available") return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await requestSellerLivePayoutAction({
        storeId,
        paymentAttemptId: candidate.paymentAttemptId,
        destinationId,
        orchestrationKey: newOrchestrationKey(candidate.paymentAttemptId),
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage("Payout request submitted. Status will update after ops attestation.");
      router.refresh();
    });
  }

  if (!requestAllowed) {
    return (
      <div
        className="mt-4 rounded-xl border border-[var(--sf-line)] bg-black/20 p-4"
        data-seller-live-payout="request-disabled"
      >
        <p className="text-sm font-semibold">Request payout</p>
        <p className="mt-1 text-xs text-[var(--sf-faint)]">
          {blockReason ||
            "Payout request is unavailable until the live path is ready."}
        </p>
        {inTransitCaptureCount > 0 ? (
          <p
            className="mt-2 text-xs text-amber-100/90"
            data-seller-live-payout-state="in-transit"
          >
            {inTransitCaptureCount} capture(s) are in transit — those payouts
            cannot be requested again.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="mt-4 space-y-3 rounded-xl border border-[var(--sf-ok)]/30 bg-[var(--sf-ok)]/5 p-4"
      data-seller-live-payout="request-enabled"
    >
      <div>
        <p className="text-sm font-semibold">Request payout</p>
        <p className="mt-1 text-xs text-[var(--sf-faint)]">
          Amount and currency are derived on the server from the RELEASED
          capture. Duplicate requests for in-transit or completed payouts are
          blocked.
        </p>
      </div>
      <ul className="space-y-2">
        {candidates.map((c) => (
          <li
            key={c.paymentAttemptId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--sf-line)] px-3 py-2"
            data-request-candidate={c.paymentAttemptId}
          >
            <div className="text-sm">
              <p className="font-semibold" dir="auto">
                {c.amountLabel}
              </p>
              <p className="text-xs text-[var(--sf-faint)]" dir="ltr">
                Order {c.orderId.slice(0, 8)}… · {c.currency}
              </p>
            </div>
            <button
              type="button"
              className="rounded-full border border-[var(--sf-ok)]/40 bg-[var(--sf-ok)]/15 px-4 py-2 text-xs font-bold uppercase tracking-wide disabled:opacity-40"
              disabled={pending}
              onClick={() => requestFor(c)}
              data-seller-live-payout-action="request"
            >
              Request payout
            </button>
          </li>
        ))}
      </ul>
      {error ? (
        <p className="text-xs text-rose-200" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-xs text-emerald-200" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
