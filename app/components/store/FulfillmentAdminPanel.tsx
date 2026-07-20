"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  confirmOrderDeliveryAction,
  updateFulfillmentLifecycleAction,
  upsertShipmentTrackingAction,
} from "../../actions/storePromotionsAdmin";
import {
  FULFILLMENT_LIFECYCLE_LABELS,
  buildFulfillmentTimeline,
  isFulfillmentLifecycleStage,
  isTerminalFulfillmentLifecycle,
  nextFulfillmentLifecycleStages,
  type FulfillmentLifecycleStage,
} from "../../../lib/store/fulfillmentRules";
import { sortFulfillmentEventsChronologically } from "../../../lib/store/adminUiHelpers";
import {
  SHIPPING_PROVIDER_KEYS,
  SHIPPING_PROVIDER_LABELS,
} from "../../../lib/store/shippingProviders";
import { TRACKING_STATUSES } from "../../../lib/store/tracking";
import type {
  OrderFulfillmentRow,
  OrderShipmentRow,
} from "../../../lib/store/promotionsFulfillment";
import StoreErrorState from "./StoreErrorState";

type Props = {
  orderId: string;
  canManage: boolean;
  fulfillment: OrderFulfillmentRow | null;
  events: Array<Record<string, unknown>>;
  shipments: OrderShipmentRow[];
};

export default function FulfillmentAdminPanel({
  orderId,
  canManage,
  fulfillment,
  events,
  shipments,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const stage: FulfillmentLifecycleStage =
    fulfillment && isFulfillmentLifecycleStage(fulfillment.lifecycle_stage)
      ? fulfillment.lifecycle_stage
      : "pending";
  const nextStages = nextFulfillmentLifecycleStages(stage);
  const terminal = isTerminalFulfillmentLifecycle(stage);
  const sortedEvents = sortFulfillmentEventsChronologically(events);
  const timeline = buildFulfillmentTimeline({
    createdAt: fulfillment?.created_at ?? new Date().toISOString(),
    stage,
    events: sortedEvents
      .map((e) => ({
        stage: String(e.to_stage ?? "") as FulfillmentLifecycleStage,
        at: String(e.created_at ?? ""),
        note: typeof e.note === "string" ? e.note : null,
      }))
      .filter((e) => isFulfillmentLifecycleStage(e.stage)),
  });

  function run(
    action: (formData: FormData) => Promise<{ ok: boolean; message?: string }>,
    formData: FormData,
    success: string,
    options?: { confirmMessage?: string }
  ) {
    if (pending) return;
    if (options?.confirmMessage && !window.confirm(options.confirmMessage)) {
      return;
    }
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await action(formData);
      if (!result.ok) {
        setError(result.message ?? "Request failed.");
        return;
      }
      setMessage(success);
      router.refresh();
    });
  }

  return (
    <section
      className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7"
      aria-busy={pending || undefined}
    >
      <h2 className="text-xl font-black tracking-tight">Fulfillment</h2>
      <p className="mt-2 text-sm text-white/45">
        Lifecycle:{" "}
        <span className="font-bold text-white/80">
          {FULFILLMENT_LIFECYCLE_LABELS[stage]}
        </span>
      </p>

      <ol className="mt-4 space-y-2">
        {timeline.map((step) => (
          <li
            key={step.stage}
            className={`rounded-xl border px-3 py-2 text-sm ${
              step.done
                ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-50"
                : "border-white/10 bg-white/[0.03] text-white/45"
            }`}
          >
            <p className="font-bold">{step.label}</p>
            {step.at ? (
              <p className="text-xs opacity-70">
                {new Date(step.at).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            ) : null}
            {step.note ? <p className="text-xs opacity-70">{step.note}</p> : null}
          </li>
        ))}
      </ol>

      {canManage && !terminal ? (
        <form
          className="mt-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              updateFulfillmentLifecycleAction,
              new FormData(e.currentTarget),
              "Fulfillment updated."
            );
          }}
        >
          <input type="hidden" name="order_id" value={orderId} />
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
              Transition to
            </span>
            <select
              name="lifecycle_stage"
              required
              disabled={pending || nextStages.length === 0}
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm"
            >
              {nextStages.length === 0 ? (
                <option value="">No further transitions</option>
              ) : (
                nextStages.map((s) => (
                  <option key={s} value={s}>
                    {FULFILLMENT_LIFECYCLE_LABELS[s]}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
              Note
            </span>
            <textarea
              name="note"
              rows={2}
              maxLength={500}
              disabled={pending}
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={pending || nextStages.length === 0}
            className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black disabled:opacity-50"
          >
            {pending ? "Updating…" : "Update fulfillment"}
          </button>
        </form>
      ) : canManage && terminal ? (
        <p className="mt-4 text-sm text-white/45">
          This fulfillment is in a terminal state and cannot be changed.
        </p>
      ) : (
        <p className="mt-4 text-sm text-white/45">
          Owner or manager role required to change fulfillment.
        </p>
      )}

      <h3 className="mt-8 text-lg font-black tracking-tight">Shipments</h3>
      {shipments.length === 0 ? (
        <p className="mt-2 text-sm text-white/45">No shipment tracking yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {shipments.map((shipment) => (
            <li
              key={shipment.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm"
            >
              <p className="font-bold">{shipment.tracking_number}</p>
              <p className="mt-1 text-xs text-white/40">
                {SHIPPING_PROVIDER_LABELS[
                  shipment.provider_key as keyof typeof SHIPPING_PROVIDER_LABELS
                ] ?? shipment.provider_key}{" "}
                · {shipment.tracking_status}
              </p>
              {shipment.estimated_delivery_at ? (
                <p className="mt-1 text-xs text-white/40">
                  ETA{" "}
                  {new Date(shipment.estimated_delivery_at).toLocaleDateString()}
                </p>
              ) : null}
              {canManage && !shipment.delivered_at ? (
                <form
                  className="mt-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(
                      confirmOrderDeliveryAction,
                      new FormData(e.currentTarget),
                      "Delivery confirmed.",
                      {
                        confirmMessage:
                          "Confirm delivery for this shipment? This marks the order as delivered.",
                      }
                    );
                  }}
                >
                  <input type="hidden" name="tracking_id" value={shipment.id} />
                  <button
                    type="submit"
                    disabled={pending}
                    className="watch-focus-ring rounded-full border border-white/15 px-4 py-2 text-xs font-bold disabled:opacity-50"
                  >
                    Confirm delivery
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canManage && !terminal ? (
        <form
          className="mt-5 grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              upsertShipmentTrackingAction,
              new FormData(e.currentTarget),
              "Tracking saved."
            );
          }}
        >
          <input type="hidden" name="order_id" value={orderId} />
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
              Provider
            </span>
            <select
              name="provider_key"
              disabled={pending}
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm"
            >
              {SHIPPING_PROVIDER_KEYS.map((key) => (
                <option key={key} value={key}>
                  {SHIPPING_PROVIDER_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
              Tracking number
            </span>
            <input
              name="tracking_number"
              required
              disabled={pending}
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
              Status
            </span>
            <select
              name="tracking_status"
              defaultValue="pending"
              disabled={pending}
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm"
            >
              {TRACKING_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
              Estimated delivery
            </span>
            <input
              name="estimated_delivery_at"
              type="datetime-local"
              disabled={pending}
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="watch-focus-ring md:col-span-2 rounded-full bg-white px-5 py-2.5 text-sm font-black text-black disabled:opacity-50"
          >
            Save tracking
          </button>
        </form>
      ) : null}

      <div aria-live="assertive" className="mt-4">
        {error ? <StoreErrorState message={error} /> : null}
      </div>
      {message ? (
        <p role="status" className="mt-2 text-sm text-emerald-200">
          {message}
        </p>
      ) : null}
    </section>
  );
}
