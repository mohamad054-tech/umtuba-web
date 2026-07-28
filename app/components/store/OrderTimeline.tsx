import { buildConfirmedBuyerTimeline } from "../../../lib/store/buyerOrdersPresentation";
import { buildOrderTimeline } from "../../../lib/store/orderRules";
import type {
  OrderStatus,
  StoreOrderStatusHistoryRow,
} from "../../../lib/store/types";

type OrderTimelineProps = {
  createdAt: string;
  status: OrderStatus;
  confirmedAt?: string | null;
  processingAt?: string | null;
  packedAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  history?: StoreOrderStatusHistoryRow[];
  /** Buyer mode: only confirmed timestamps; no invented future steps. */
  confirmedEventsOnly?: boolean;
};

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function OrderTimeline({
  createdAt,
  status,
  confirmedAt,
  processingAt,
  packedAt,
  shippedAt,
  deliveredAt,
  cancelledAt,
  history = [],
  confirmedEventsOnly = false,
}: OrderTimelineProps) {
  if (confirmedEventsOnly) {
    const events = buildConfirmedBuyerTimeline({
      createdAt,
      status,
      confirmedAt,
      processingAt,
      packedAt,
      shippedAt,
      deliveredAt,
      cancelledAt,
    });

    return (
      <div className="space-y-6">
        {events.length === 0 ? (
          <p className="text-sm text-[var(--sf-faint)]">
            No confirmed timeline events yet.
          </p>
        ) : (
          <ol className="space-y-3">
            {events.map((step) => (
              <li key={step.key} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--sf-accent)]"
                />
                <div>
                  <p className="text-sm font-semibold text-[var(--sf-ink)]">
                    {step.label}
                  </p>
                  <p className="text-xs text-[var(--sf-faint)]">
                    {formatWhen(step.at)} · {step.kind}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}

        {history.length > 0 ? (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--sf-faint)]">
              Recorded history
            </h3>
            <ul className="mt-3 space-y-2">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-2xl border border-[var(--sf-line)] bg-white/[0.03] px-3 py-2 text-xs text-[var(--sf-muted)]"
                >
                  <p>
                    {entry.to_status ? `Order → ${entry.to_status}` : null}
                    {entry.to_status && entry.to_fulfillment_status
                      ? " · "
                      : null}
                    {entry.to_fulfillment_status
                      ? `Fulfillment → ${entry.to_fulfillment_status}`
                      : null}
                    {entry.to_payment_status
                      ? `${entry.to_status || entry.to_fulfillment_status ? " · " : ""}Payment → ${entry.to_payment_status}`
                      : null}
                  </p>
                  <p className="mt-1 text-[var(--sf-faint)]">
                    {formatWhen(entry.created_at)} · {entry.source}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  const steps = buildOrderTimeline({
    createdAt,
    status,
    confirmedAt,
    processingAt,
    packedAt,
    shippedAt,
    deliveredAt,
    cancelledAt,
  });

  return (
    <div className="space-y-6">
      <ol className="space-y-3">
        {steps.map((step) => (
          <li key={step.key} className="flex gap-3">
            <span
              aria-hidden
              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                step.done ? "bg-[var(--sf-ok)]" : "bg-white/20"
              }`}
            />
            <div>
              <p
                className={`text-sm font-bold ${
                  step.done ? "text-white/90" : "text-white/40"
                }`}
              >
                {step.label}
              </p>
              <p className="text-xs text-white/40">{formatWhen(step.at)}</p>
            </div>
          </li>
        ))}
      </ol>

      {history.length > 0 ? (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">
            Audit history
          </h3>
          <ul className="mt-3 space-y-2">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/55"
              >
                <p>
                  {entry.to_status ? `Status → ${entry.to_status}` : null}
                  {entry.to_status && entry.to_fulfillment_status
                    ? " · "
                    : null}
                  {entry.to_fulfillment_status
                    ? `Fulfillment → ${entry.to_fulfillment_status}`
                    : null}
                  {entry.to_payment_status
                    ? `Payment → ${entry.to_payment_status}`
                    : null}
                </p>
                <p className="mt-1 text-white/35">
                  {formatWhen(entry.created_at)} · {entry.source}
                  {entry.note ? ` · ${entry.note}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
