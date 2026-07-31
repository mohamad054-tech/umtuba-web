import Link from "next/link";
import type { SellerPayoutHistorySurfaceView } from "../../../lib/store/sellerPayoutHistorySurface";

type Props = {
  surface: SellerPayoutHistorySurfaceView;
  loadMoreHref: string | null;
};

function statusToneClass(status: string): string {
  if (status === "completed") return "text-[var(--sf-ok)]";
  if (status === "in_transit") return "text-amber-100";
  return "text-[var(--sf-accent-strong)]";
}

/**
 * Narrow seller-facing payout history. Read-only — no withdraw / bank controls.
 */
export default function SellerPayoutHistory({ surface, loadMoreHref }: Props) {
  return (
    <section
      className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5"
      aria-labelledby="seller-payout-history-heading"
      data-capability={surface.capability}
    >
      <h2
        id="seller-payout-history-heading"
        className="sf-display text-xl font-semibold tracking-tight"
      >
        Payout history
      </h2>
      <p className="mt-1 text-sm text-[var(--sf-faint)]">
        Trusted settlement releases and payout booking status. Bank withdrawals
        are not enabled yet.
      </p>

      {surface.state === "unavailable" ? (
        <p role="status" className="mt-4 text-sm text-amber-100">
          {surface.message}
        </p>
      ) : null}

      {surface.state === "empty" ? (
        <p
          role="status"
          className="mt-4 rounded-2xl border border-dashed border-[var(--sf-line)] px-4 py-8 text-center text-sm text-[var(--sf-faint)]"
        >
          {surface.message}
        </p>
      ) : null}

      {surface.state === "ready" ? (
        <ul className="mt-4 space-y-2" aria-label="Payout history rows">
          {surface.rows.map((row) => (
            <li
              key={row.key}
              className="rounded-xl border border-[var(--sf-line)] bg-black/20 px-3 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold tracking-tight">
                    {row.amountLabel}{" "}
                    <span className="text-[var(--sf-faint)]">
                      · {row.currency}
                    </span>
                  </p>
                  <p
                    className={`mt-1 text-xs font-bold uppercase tracking-[0.14em] ${statusToneClass(row.status)}`}
                  >
                    {row.statusLabel}
                    <span className="sr-only"> ({row.status})</span>
                  </p>
                  <p className="mt-1 text-xs text-[var(--sf-faint)]">
                    Captured {row.captureAtLabel}
                    {row.lastActivityAtLabel
                      ? ` · Last payout activity ${row.lastActivityAtLabel}`
                      : null}
                  </p>
                  {row.failNote ? (
                    <p className="mt-1 text-xs text-amber-100/90">{row.failNote}</p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {surface.state === "ready" && surface.hasMore && loadMoreHref ? (
        <div className="mt-4">
          <Link
            href={loadMoreHref}
            className="watch-focus-ring inline-flex rounded-full border border-[var(--sf-line)] px-4 py-2 text-sm font-semibold text-[var(--sf-accent-strong)]"
          >
            Load older payouts
          </Link>
        </div>
      ) : null}

      {!surface.bankRailsEnabled ? (
        <p className="mt-4 text-xs text-[var(--sf-faint)]">
          No withdraw or bank-connect actions while payout rails remain disabled.
        </p>
      ) : null}
    </section>
  );
}
