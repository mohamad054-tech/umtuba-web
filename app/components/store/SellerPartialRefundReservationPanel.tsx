import type { PartialRefundAccountingReviewModel } from "../../../lib/store/partialRefundReservationAccounting";
import type { PartialRefundReservationSafeCommitView } from "../../../lib/store/partialRefundReservation";

type Props = {
  reservations: readonly PartialRefundReservationSafeCommitView[];
  loadError: string | null;
  accounting: PartialRefundAccountingReviewModel | null;
  accountingError: string | null;
};

/**
 * Seller read-only partial-refund ledger reservation + accounting review.
 * Sellers cannot request, cancel, or execute refunds from this surface.
 * Amounts follow existing seller refund-ops policy (order totals already shown).
 */
export default function SellerPartialRefundReservationPanel({
  reservations,
  loadError,
  accounting,
  accountingError,
}: Props) {
  return (
    <section
      aria-labelledby="seller-pr-reservation-heading"
      className="mt-6 rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7"
      data-testid="seller-partial-refund-reservation-panel"
    >
      <h2
        id="seller-pr-reservation-heading"
        className="sf-display text-xl font-semibold tracking-tight"
      >
        Partial refund ledger reservations
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--sf-muted)]">
        Read-only ledger reservation status and accounting. A reservation is
        not a completed money refund. Sellers cannot create reservations or
        execute provider refunds from this surface.
      </p>

      {loadError ? (
        <p role="alert" className="mt-3 text-sm text-[var(--sf-danger)]">
          {loadError}
        </p>
      ) : null}
      {accountingError ? (
        <p role="alert" className="mt-3 text-sm text-[var(--sf-danger)]">
          {accountingError}
        </p>
      ) : null}

      {accounting ? (
        <div
          className="mt-4 space-y-3"
          data-testid="seller-pr-accounting-review"
        >
          <p
            role="status"
            className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          >
            Ledger reservation only — no provider refund or money movement has
            occurred.
          </p>
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-[var(--sf-faint)]">
                Capture
              </dt>
              <dd className="font-semibold text-[var(--sf-ink)]">
                {accounting.captureAmountMinor} {accounting.currency}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-[var(--sf-faint)]">
                Reserved
              </dt>
              <dd className="font-semibold text-[var(--sf-ink)]">
                {accounting.committedReservationAmountMinor}{" "}
                {accounting.currency}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-[var(--sf-faint)]">
                Remaining
              </dt>
              <dd className="font-semibold text-[var(--sf-ink)]">
                {accounting.remainingReservableAmountMinor}{" "}
                {accounting.currency}
              </dd>
            </div>
          </dl>
          <ul className="space-y-2 text-sm">
            {accounting.lines.map((line) => (
              <li
                key={line.orderItemId}
                className="rounded-2xl border border-[var(--sf-line)] bg-white/[0.03] px-3 py-2"
                data-testid="seller-pr-acct-line"
              >
                <span className="font-medium text-[var(--sf-ink)]">
                  {line.titleSnapshot}
                </span>
                <span className="mt-1 block text-xs text-[var(--sf-muted)]">
                  purchased {line.purchasedQuantity} · reserved{" "}
                  {line.committedReservedQuantity} · remaining{" "}
                  {line.remainingReservableQuantity}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {reservations.length === 0 && !loadError ? (
        <p className="mt-4 text-sm text-[var(--sf-faint)]">
          No committed ledger reservations for this order capture.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {reservations.map((r) => (
            <li
              key={r.ledgerId}
              className="rounded-2xl border border-[var(--sf-line)] bg-white/[0.03] px-4 py-3 text-sm"
              data-testid="seller-pr-reservation-row"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[var(--sf-ink)]">
                  Reserved {r.reservedAmountMinor} {r.currency}
                </span>
                <span className="rounded-full border border-[var(--sf-line)] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--sf-muted)]">
                  {r.status}
                </span>
              </div>
              <p className="mt-2 text-[var(--sf-muted)]">
                Provider refund not performed · money not moved · stock not
                restocked
              </p>
              <p className="mt-1 text-xs text-[var(--sf-faint)]">
                Updated {new Date(r.updatedAtIso).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
