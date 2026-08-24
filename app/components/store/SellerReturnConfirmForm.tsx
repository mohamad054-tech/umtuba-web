"use client";

import { useState, useTransition } from "react";
import { confirmStoreOrderReturnedAction } from "../../actions/storeReturns";

type SellerReturnConfirmFormProps = {
  orderId: string;
};

export default function SellerReturnConfirmForm({
  orderId,
}: SellerReturnConfirmFormProps) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await confirmStoreOrderReturnedAction(formData);
      if (!result.ok) {
        setError(result.message);
        setMessage(null);
        return;
      }
      setError(null);
      setMessage(result.message);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-2xl border border-[var(--sf-line)] bg-white/[0.03] p-4"
    >
      <input type="hidden" name="order_id" value={orderId} />
      <p className="text-sm text-[var(--sf-muted)]">
        Confirm that the returned goods were received. This does not refund money.
      </p>
      <textarea
        name="note"
        maxLength={2000}
        rows={2}
        placeholder="Optional receiving note"
        className="w-full rounded-2xl border border-[var(--sf-line)] bg-transparent px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="sf-btn sf-btn-ghost disabled:opacity-60"
      >
        {pending ? "…" : "Confirm returned"}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-rose-300">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-sm text-emerald-200">
          {message}
        </p>
      ) : null}
    </form>
  );
}
