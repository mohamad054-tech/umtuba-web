import type { PartialRefundReservationSafeCommitView } from "../../../lib/store/partialRefundReservation";

type Props = {
  reservations: readonly PartialRefundReservationSafeCommitView[];
  loadError: string | null;
};

/**
 * Seller read-only partial-refund ledger reservation status.
 * Sellers cannot request reservations from this surface (policy fail-closed).
 */
export default function SellerPartialRefundReservationPanel({
  reservations,
  loadError,
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
        Read-only ledger reservation status. A reservation is not a completed
        money refund. Sellers cannot create reservations or execute provider
        refunds from this surface.
      </p>

      {loadError ? (
        <p role="alert" className="mt-3 text-sm text-[var(--sf-danger)]">
          {loadError}
        </p>
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
