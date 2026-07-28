"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buyerCancelOrderAction } from "../../actions/storeOrders";

type Props = {
  orderId: string;
  canCancel: boolean;
};

export default function BuyerCancelOrderButton({ orderId, canCancel }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canCancel) return null;

  return (
    <div className="mt-4 space-y-2">
      <button
        type="button"
        disabled={pending}
        className="watch-focus-ring rounded-full border border-[rgba(240,168,168,0.35)] bg-[rgba(240,168,168,0.08)] px-4 py-2 text-sm font-semibold text-[var(--sf-danger)] disabled:opacity-50"
        onClick={() => {
          if (pending) return;
          if (
            !window.confirm(
              "Cancel this unpaid order? Reserved inventory will be released."
            )
          ) {
            return;
          }
          setError(null);
          setMessage(null);
          startTransition(async () => {
            const result = await buyerCancelOrderAction(orderId);
            if (!result.ok) {
              setError(result.message);
              return;
            }
            setMessage(
              result.data.unchanged
                ? "Order was already cancelled."
                : "Order cancelled. Inventory hold released."
            );
            router.refresh();
          });
        }}
      >
        {pending ? "Cancelling…" : "Cancel unpaid order"}
      </button>
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
