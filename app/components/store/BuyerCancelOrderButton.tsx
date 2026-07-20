"use client";

import { useState, useTransition } from "react";
import { buyerCancelOrderAction } from "../../actions/storeOrders";

type Props = {
  orderId: string;
  canCancel: boolean;
};

export default function BuyerCancelOrderButton({ orderId, canCancel }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canCancel) return null;

  return (
    <div className="mt-4 space-y-2">
      <button
        type="button"
        disabled={pending}
        className="watch-focus-ring rounded-full border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-100 disabled:opacity-50"
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
          });
        }}
      >
        {pending ? "Cancelling…" : "Cancel unpaid order"}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-red-100">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-sm text-emerald-100">
          {message}
        </p>
      ) : null}
    </div>
  );
}
