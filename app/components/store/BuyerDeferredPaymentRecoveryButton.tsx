"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ensureDeferredPaymentAttemptAction } from "../../actions/storeCheckout";

type Props = {
  orderId: string;
  enabled: boolean;
  reason?: string;
  hasAttempt: boolean;
};

export default function BuyerDeferredPaymentRecoveryButton({
  orderId,
  enabled,
  reason,
  hasAttempt,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!enabled) {
    return reason ? (
      <p className="text-xs text-[var(--sf-faint)]">{reason}</p>
    ) : null;
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        className="watch-focus-ring rounded-full border border-[rgba(214,196,161,0.35)] bg-[rgba(214,196,161,0.1)] px-4 py-2 text-sm font-semibold text-[var(--sf-accent-strong)] disabled:opacity-50"
        onClick={() => {
          if (pending) return;
          setError(null);
          setMessage(null);
          startTransition(async () => {
            const form = new FormData();
            form.set("order_id", orderId);
            const result = await ensureDeferredPaymentAttemptAction(form);
            if (!result.ok) {
              setError(result.message);
              return;
            }
            setMessage(
              result.data.payment_recording_incomplete
                ? "Deferred payment recording is still incomplete. No charge was made."
                : hasAttempt
                  ? "Deferred payment record refreshed. No charge was made."
                  : "Deferred payment attempt recorded. No charge was made."
            );
            router.refresh();
          });
        }}
      >
        {pending
          ? "Working…"
          : hasAttempt
            ? "Refresh deferred payment record"
            : "Record deferred payment attempt"}
      </button>
      <p className="text-xs leading-relaxed text-[var(--sf-faint)]">
        Live payment collection is not enabled. This only ensures a deferred
        payment attempt row exists for the confirmed order — it does not charge
        a card or create a second order.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-[var(--sf-danger)]">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-sm text-[var(--sf-ok)]">
          {message}
        </p>
      ) : null}
    </div>
  );
}
