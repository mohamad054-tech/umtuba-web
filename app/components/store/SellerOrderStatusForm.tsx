"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { updateSellerOrderStatusAction } from "../../actions/storeOrders";
import {
  isPaymentBlockingFulfillmentProgress,
  paymentBlockReason,
  sellerFulfillmentStatusOptions,
  sellerOrderStatusOptions,
  validateSellerStatusFormSelection,
} from "../../../lib/store/sellerOrdersPresentation";
import type {
  FulfillmentStatus,
  OrderStatus,
} from "../../../lib/store/types";
import StoreErrorState from "./StoreErrorState";

type SellerOrderStatusFormProps = {
  orderId: string;
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  paymentStatus: string;
  canUpdate: boolean;
};

export default function SellerOrderStatusForm({
  orderId,
  status,
  fulfillmentStatus,
  paymentStatus,
  canUpdate,
}: SellerOrderStatusFormProps) {
  const router = useRouter();
  const submitLockRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const statusOptions = sellerOrderStatusOptions({ status, paymentStatus });
  const fulfillmentOptions = sellerFulfillmentStatusOptions({
    fulfillmentStatus,
    paymentStatus,
  });
  const paymentBlocked = isPaymentBlockingFulfillmentProgress(paymentStatus);

  if (!canUpdate) {
    return (
      <p className="rounded-2xl border border-[var(--sf-line)] bg-white/[0.03] px-4 py-3 text-sm text-[var(--sf-faint)]">
        Status updates require an owner or manager role, and terminal orders
        cannot be changed.
      </p>
    );
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || submitLockRef.current) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const selectedStatus = String(formData.get("status") ?? "");
    const selectedFulfillment = String(
      formData.get("fulfillment_status") ?? ""
    );

    const validated = validateSellerStatusFormSelection({
      currentStatus: status,
      currentFulfillment: fulfillmentStatus,
      paymentStatus,
      selectedStatus,
      selectedFulfillment,
    });
    if (!validated.ok) {
      setError(validated.message);
      setMessage(null);
      return;
    }

    submitLockRef.current = true;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await updateSellerOrderStatusAction(formData);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setMessage(
          result.data.unchanged
            ? "No changes applied — state was already current."
            : "Order updated. Trusted server state refreshed."
        );
        router.refresh();
      } finally {
        submitLockRef.current = false;
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-busy={pending || undefined}>
      <input type="hidden" name="order_id" value={orderId} />

      {paymentBlocked ? (
        <p
          role="status"
          className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
        >
          {paymentBlockReason(paymentStatus)}
        </p>
      ) : null}

      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
          Order lifecycle
        </span>
        <select
          name="status"
          defaultValue=""
          disabled={pending || statusOptions.length === 0}
          className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-3 text-sm outline-none focus:border-[rgba(214,196,161,0.45)]"
        >
          <option value="">Keep current ({status})</option>
          {statusOptions.map((option) => (
            <option
              key={option.value}
              value={option.paymentBlocked ? "" : option.value}
              disabled={option.paymentBlocked}
            >
              {option.label}
              {option.paymentBlocked ? " (blocked by payment)" : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
          Fulfillment lifecycle
        </span>
        <select
          name="fulfillment_status"
          defaultValue=""
          disabled={pending || fulfillmentOptions.length === 0}
          className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-3 text-sm outline-none focus:border-[rgba(214,196,161,0.45)]"
        >
          <option value="">Keep current ({fulfillmentStatus})</option>
          {fulfillmentOptions.map((option) => (
            <option
              key={option.value}
              value={option.paymentBlocked ? "" : option.value}
              disabled={option.paymentBlocked}
            >
              {option.label}
              {option.paymentBlocked ? " (blocked by payment)" : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
          Internal note (optional)
        </span>
        <textarea
          name="note"
          rows={2}
          maxLength={500}
          disabled={pending}
          className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-3 text-sm outline-none focus:border-[rgba(214,196,161,0.45)]"
          placeholder="Visible in seller audit history"
        />
      </label>

      <p className="text-xs leading-relaxed text-[var(--sf-faint)]">
        Payment status is not editable here. Sellers cannot mark payments
        successful. Inventory quantities are not edited by these transitions.
        Shipping Network handoff is not invented — “Handed to shipping” only
        advances trusted order state.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="watch-focus-ring rounded-full bg-[var(--sf-accent)] px-5 py-2.5 text-sm font-bold text-[#1a1712] disabled:opacity-50"
      >
        {pending ? "Updating…" : "Apply trusted update"}
      </button>

      {error ? (
        <div className="pt-1" aria-live="assertive">
          <StoreErrorState message={error} />
        </div>
      ) : null}
      {message ? (
        <p role="status" className="text-sm text-[var(--sf-ok)]">
          {message}
        </p>
      ) : null}
    </form>
  );
}
