"use client";

/**
 * Seller payout destination form (Slice S7).
 * Masked display data only. Calls upsertSellerPayoutDestinationAction only.
 * Sellers cannot self-verify destinations.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertSellerPayoutDestinationAction } from "../../actions/storeSellerLivePayout";
import type { SellerPayoutDestinationSurfaceView } from "../../../lib/store/sellerPayoutEligibilitySurface";
import { SELLER_LIVE_PAYOUT_V1_PROVIDER_ID } from "../../../lib/store/sellerLivePayout";

export type SellerPayoutDestinationFormProps = {
  storeId: string;
  destinations: SellerPayoutDestinationSurfaceView[];
  enabled: boolean;
};

export default function SellerPayoutDestinationForm({
  storeId,
  destinations,
  enabled,
}: SellerPayoutDestinationFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [displayLabel, setDisplayLabel] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [requestReview, setRequestReview] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function submit() {
    if (!enabled || pending) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await upsertSellerPayoutDestinationAction({
        storeId,
        currency,
        displayLabel,
        requestReview,
        providerId: SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage("Destination saved. Platform verification is required.");
      setDisplayLabel("");
      router.refresh();
    });
  }

  return (
    <div
      className="mt-4 space-y-3 rounded-xl border border-[var(--sf-line)] bg-black/20 p-4"
      data-seller-live-payout="destination-form"
    >
      <div>
        <h3 className="text-sm font-bold tracking-tight">Payout destination</h3>
        <p className="mt-1 text-xs text-[var(--sf-faint)]">
          Masked label only. You cannot self-verify a destination. Full bank
          account numbers are not accepted.
        </p>
      </div>

      {destinations.length > 0 ? (
        <ul className="space-y-2 text-sm" aria-label="Saved destinations">
          {destinations.map((d) => (
            <li
              key={d.id}
              className="rounded-lg border border-[var(--sf-line)] px-3 py-2"
              data-destination-verification={d.verificationState}
            >
              <p className="font-semibold" dir="auto">
                {d.displayLabel}
              </p>
              <p className="mt-0.5 text-xs text-[var(--sf-faint)]" dir="ltr">
                {d.providerId} · {d.currency} · {d.verificationState}
                {d.isActive ? "" : " · inactive"}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[var(--sf-faint)]">No destination on file.</p>
      )}

      {!enabled ? (
        <p className="text-xs text-amber-100/90" data-destination-form="disabled">
          Destination management is unavailable for this role or state.
        </p>
      ) : (
        <fieldset className="space-y-3" disabled={pending}>
          <legend className="sr-only">Add or update masked destination</legend>
          <label className="block text-xs text-[var(--sf-muted)]">
            Masked display label
            <input
              className="mt-1 w-full rounded-xl border border-[var(--sf-line)] bg-black/30 px-3 py-2 text-sm text-[var(--sf-ink)]"
              value={displayLabel}
              onChange={(e) => setDisplayLabel(e.target.value)}
              placeholder="Ops clearing •••• 42"
              maxLength={80}
              dir="auto"
              data-destination-field="displayLabel"
            />
          </label>
          <label className="block text-xs text-[var(--sf-muted)]">
            Currency
            <select
              className="mt-1 w-full rounded-xl border border-[var(--sf-line)] bg-black/30 px-3 py-2 text-sm text-[var(--sf-ink)]"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              dir="ltr"
              data-destination-field="currency"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="ZAR">ZAR</option>
            </select>
          </label>
          <p className="text-xs text-[var(--sf-faint)]">
            Provider:{" "}
            <code dir="ltr">{SELLER_LIVE_PAYOUT_V1_PROVIDER_ID}</code> (only
            V1 live provider). Stripe Connect, Wise, and PayPal are not
            selectable.
          </p>
          <label className="flex items-center gap-2 text-xs text-[var(--sf-muted)]">
            <input
              type="checkbox"
              checked={requestReview}
              onChange={(e) => setRequestReview(e.target.checked)}
              data-destination-field="requestReview"
            />
            Request platform review
          </label>
          {/* Intentionally no verification_state / verified controls. */}
          <button
            type="button"
            className="rounded-full border border-[var(--sf-accent-strong)]/40 bg-[var(--sf-accent-strong)]/15 px-4 py-2 text-xs font-bold uppercase tracking-wide text-[var(--sf-ink)] disabled:opacity-40"
            disabled={pending || displayLabel.trim().length < 3}
            onClick={submit}
            data-seller-live-payout-action="upsert-destination"
          >
            Save destination
          </button>
        </fieldset>
      )}

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
