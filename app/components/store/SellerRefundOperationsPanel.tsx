import type { SellerRefundOperationsReadModel } from "../../../lib/store/refundOperations";

type Props = {
  surface: SellerRefundOperationsReadModel;
};

/**
 * Seller read-only refund ops surface. No money execution controls.
 */
export default function SellerRefundOperationsPanel({ surface }: Props) {
  return (
    <section
      aria-labelledby="seller-refund-ops-heading"
      className="mt-6 rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7"
    >
      <h2
        id="seller-refund-ops-heading"
        className="sf-display text-xl font-semibold tracking-tight"
      >
        Refund status
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--sf-muted)]">
        Read-only view of refund operations for this order. Sellers cannot
        execute financial refunds from this surface.
      </p>

      {surface.requests.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--sf-faint)]">
          No refund requests for this order.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {surface.requests.map((req) => (
            <li
              key={req.id}
              className="rounded-2xl border border-[var(--sf-line)] bg-white/[0.03] px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[var(--sf-ink)]">
                  {req.trustedAmountMinor} {req.currency}
                </span>
                <span className="rounded-full border border-[var(--sf-line)] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--sf-muted)]">
                  {req.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="mt-2 text-[var(--sf-muted)]">Reason: {req.reason}</p>
              {req.rejectionReason ? (
                <p className="mt-1 text-[var(--sf-danger)]">
                  Rejection: {req.rejectionReason}
                </p>
              ) : null}
              {req.failureMessageSafe ? (
                <p className="mt-1 text-amber-100/90">
                  Failure: {req.failureMessageSafe}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {surface.timeline.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-[var(--sf-ink)]">Timeline</h3>
          <ol className="mt-2 space-y-2 text-xs text-[var(--sf-muted)]">
            {surface.timeline.map((ev) => (
              <li key={ev.id}>
                <span className="font-semibold text-[var(--sf-ink)]">
                  {ev.toStatus.replace(/_/g, " ")}
                </span>
                {ev.fromStatus ? ` ← ${ev.fromStatus.replace(/_/g, " ")}` : ""}
                {" · "}
                {new Date(ev.createdAt).toLocaleString()}
                {ev.note ? ` · ${ev.note}` : ""}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
