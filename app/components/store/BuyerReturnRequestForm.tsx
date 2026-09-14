"use client";

import { useState, useTransition } from "react";
import { requestStoreOrderReturnAction } from "../../actions/storeReturns";

type BuyerReturnRequestFormProps = {
  orderId: string;
  cta: string;
  hint: string;
};

export default function BuyerReturnRequestForm({
  orderId,
  cta,
  hint,
}: BuyerReturnRequestFormProps) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await requestStoreOrderReturnAction(formData);
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
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="order_id" value={orderId} />
      <label className="block text-sm text-[var(--sf-muted)]">
        {hint}
        <textarea
          name="reason"
          required
          minLength={8}
          maxLength={2000}
          rows={3}
          className="mt-2 w-full rounded-2xl border border-[var(--sf-line)] bg-transparent px-3 py-2 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="sf-btn sf-btn-ghost disabled:opacity-60"
      >
        {pending ? "…" : cta}
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
