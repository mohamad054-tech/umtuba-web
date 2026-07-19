"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateSellerOrderStatusAction } from "../../actions/storeOrders";
import {
  nextFulfillmentStatuses,
  nextSellerOrderStatuses,
} from "../../../lib/store/orderRules";
import type {
  FulfillmentStatus,
  OrderStatus,
} from "../../../lib/store/types";
import StoreErrorState from "./StoreErrorState";

type SellerOrderStatusFormProps = {
  orderId: string;
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  canUpdate: boolean;
};

export default function SellerOrderStatusForm({
  orderId,
  status,
  fulfillmentStatus,
  canUpdate,
}: SellerOrderStatusFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nextStatuses = nextSellerOrderStatuses(status);
  const nextFulfillment = nextFulfillmentStatuses(fulfillmentStatus);

  if (!canUpdate) {
    return (
      <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/45">
        Status updates require an owner or manager role, and terminal orders
        cannot be changed.
      </p>
    );
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateSellerOrderStatusAction(formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage(
        result.data.unchanged
          ? "No changes applied."
          : "Order updated successfully."
      );
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="order_id" value={orderId} />
      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
          Order status
        </span>
        <select
          name="status"
          defaultValue=""
          disabled={pending || nextStatuses.length === 0}
          className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm outline-none focus:border-blue-400/40"
        >
          <option value="">Keep current ({status})</option>
          {nextStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
          Fulfillment status
        </span>
        <select
          name="fulfillment_status"
          defaultValue=""
          disabled={pending || nextFulfillment.length === 0}
          className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm outline-none focus:border-blue-400/40"
        >
          <option value="">Keep current ({fulfillmentStatus})</option>
          {nextFulfillment.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
          Internal note (optional)
        </span>
        <textarea
          name="note"
          rows={2}
          maxLength={500}
          disabled={pending}
          className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm outline-none focus:border-blue-400/40"
          placeholder="Visible in order audit history"
        />
      </label>

      <p className="text-xs text-white/35">
        Payment status is not editable here. Payment collection is deferred.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black disabled:opacity-50"
      >
        {pending ? "Updating…" : "Update order"}
      </button>

      {error ? (
        <div className="pt-1">
          <StoreErrorState message={error} />
        </div>
      ) : null}
      {message ? (
        <p role="status" className="text-sm text-emerald-200">
          {message}
        </p>
      ) : null}
    </form>
  );
}
