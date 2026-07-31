import type { SellerPayoutEligibilitySurfaceView } from "../../../lib/store/sellerPayoutEligibilitySurface";

type Props = {
  surface: SellerPayoutEligibilitySurfaceView;
};

function highlightLabel(
  highlight: SellerPayoutEligibilitySurfaceView["highlights"][number]
): string {
  switch (highlight) {
    case "eligible_balance_available":
      return "Settled balance available";
    case "no_settled_payable_balance":
      return "No settled payable balance";
    case "bank_rails_disabled":
      return "Bank payout rails disabled";
    case "payout_reads_unavailable":
      return "Payout reads unavailable";
    case "unauthorized":
      return "Not authorized";
    default:
      return highlight;
  }
}

/**
 * Narrow seller-facing payout eligibility. Read-only — no withdraw / bank controls.
 */
export default function SellerPayoutEligibility({ surface }: Props) {
  return (
    <section
      className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5"
      aria-labelledby="seller-payout-eligibility-heading"
      data-capability={surface.capability}
      data-overall-state={surface.overallState}
    >
      <h2
        id="seller-payout-eligibility-heading"
        className="sf-display text-xl font-semibold tracking-tight"
      >
        Payout eligibility
      </h2>
      <p className="mt-1 text-sm text-[var(--sf-faint)]">
        Trusted status only. Withdrawals and bank connections are not available
        yet.
      </p>

      {surface.overallState === "unavailable" ||
      surface.overallState === "unauthorized" ? (
        <p role="status" className="mt-4 text-sm text-amber-100">
          {surface.message}
        </p>
      ) : null}

      {surface.overallState === "ready" ? (
        <>
          <ul
            className="mt-4 flex flex-wrap gap-2"
            aria-label="Payout eligibility highlights"
          >
            {surface.highlights.map((h) => (
              <li
                key={h}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  h === "eligible_balance_available"
                    ? "border-[var(--sf-ok)]/40 text-[var(--sf-ok)]"
                    : h === "bank_rails_disabled"
                      ? "border-[var(--sf-line)] text-[var(--sf-faint)]"
                      : "border-amber-400/30 text-amber-100"
                }`}
              >
                {highlightLabel(h)}
                <span className="sr-only"> ({h})</span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--sf-line)] bg-black/20 px-3 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                Balance visibility
              </dt>
              <dd className="mt-1 text-sm font-semibold">
                {surface.balanceVisibilityAvailable ? "Available" : "Unavailable"}
              </dd>
            </div>
            <div className="rounded-xl border border-[var(--sf-line)] bg-black/20 px-3 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                Available captures
              </dt>
              <dd className="mt-1 text-sm font-semibold">
                {surface.availableCaptureCount}
              </dd>
            </div>
            <div className="rounded-xl border border-[var(--sf-line)] bg-black/20 px-3 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                In transit
              </dt>
              <dd className="mt-1 text-sm font-semibold">
                {surface.inTransitCaptureCount}
              </dd>
            </div>
          </dl>

          {surface.reasonLines.length > 0 ? (
            <ul className="mt-4 space-y-1 text-sm text-[var(--sf-muted)]">
              {surface.reasonLines.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="text-[var(--sf-faint)]" aria-hidden>
                    ·
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {surface.currencyBuckets.length > 0 ? (
            <dl
              className="mt-4 grid gap-2 sm:grid-cols-2"
              aria-label="Per-currency available balances"
            >
              {surface.currencyBuckets.map((bucket) => (
                <div
                  key={bucket.currency}
                  className="rounded-xl border border-[var(--sf-line)] bg-black/20 px-3 py-2"
                >
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                    {bucket.currency}
                  </dt>
                  <dd className="mt-1 text-sm text-[var(--sf-muted)]">
                    Available {bucket.availableLabel}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </>
      ) : null}

      {!surface.actionButtonsEnabled && surface.bankRailsDisabled ? (
        <p className="mt-4 text-xs text-[var(--sf-faint)]">
          No withdraw or bank-connect actions while payout rails remain disabled.
        </p>
      ) : null}
    </section>
  );
}
