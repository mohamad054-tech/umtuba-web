import Link from "next/link";
import type { PayoutReconSurfaceView } from "../../../lib/store/payoutReconciliationSurface";

type Props = {
  surface: PayoutReconSurfaceView;
  loadMoreHref: string | null;
};

function severityTone(severity: string): string {
  if (severity === "error") return "text-[var(--sf-danger)]";
  if (severity === "warning" || severity === "info") return "text-amber-100";
  return "text-[var(--sf-ok)]";
}

function overallLabel(state: PayoutReconSurfaceView["overallState"]): string {
  if (state === "aligned") return "Aligned";
  if (state === "issues_detected") return "Issues detected";
  return "Unavailable";
}

/**
 * Narrow seller-facing reconciliation diagnostics. Read-only — no repair actions.
 */
export default function SellerPayoutReconciliation({
  surface,
  loadMoreHref,
}: Props) {
  return (
    <section
      className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5"
      aria-labelledby="seller-payout-recon-heading"
      data-capability={surface.capability}
      data-overall-state={surface.overallState}
    >
      <h2
        id="seller-payout-recon-heading"
        className="sf-display text-xl font-semibold tracking-tight"
      >
        Settlement ↔ payout check
      </h2>
      <p className="mt-1 text-sm text-[var(--sf-faint)]">
        Trusted diagnostics only. No payout actions or bank withdrawals from
        this section.
      </p>

      <p
        className={`mt-3 text-xs font-bold uppercase tracking-[0.14em] ${
          surface.overallState === "aligned"
            ? "text-[var(--sf-ok)]"
            : surface.overallState === "issues_detected"
              ? "text-amber-100"
              : "text-amber-100"
        }`}
      >
        {overallLabel(surface.overallState)}
        <span className="sr-only"> ({surface.overallState})</span>
      </p>

      {surface.overallState === "unavailable" ? (
        <p role="status" className="mt-4 text-sm text-amber-100">
          {surface.message}
        </p>
      ) : null}

      {surface.overallState === "aligned" ? (
        <p
          role="status"
          className="mt-4 rounded-2xl border border-dashed border-[var(--sf-line)] px-4 py-8 text-center text-sm text-[var(--sf-faint)]"
        >
          {surface.message}
        </p>
      ) : null}

      {surface.currencySummaries.length > 0 ? (
        <dl
          className="mt-4 grid gap-2 sm:grid-cols-2"
          aria-label="Per-currency reconciliation summary"
        >
          {surface.currencySummaries.map((bucket) => (
            <div
              key={bucket.currency}
              className="rounded-xl border border-[var(--sf-line)] bg-black/20 px-3 py-2"
            >
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                {bucket.currency}
              </dt>
              <dd className="mt-1 text-sm text-[var(--sf-muted)]">
                {bucket.captureCount} captures · {bucket.issueCount} with
                issues · {bucket.errorCount} errors · {bucket.infoCount} info
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {surface.overallState === "issues_detected" ? (
        <ul className="mt-4 space-y-2" aria-label="Reconciliation issues">
          {surface.rows.map((row) => (
            <li
              key={row.key}
              className="rounded-xl border border-[var(--sf-line)] bg-black/20 px-3 py-3"
            >
              <p className="text-sm font-semibold tracking-tight">
                {row.amountLabel}{" "}
                <span className="text-[var(--sf-faint)]">· {row.currency}</span>
              </p>
              <p className="mt-1 text-xs text-[var(--sf-faint)]">
                Captured {row.captureAtLabel}
              </p>
              <ul className="mt-2 space-y-2">
                {row.issues.map((issue) => (
                  <li key={`${row.key}-${issue.trustedCode}-${issue.category}`}>
                    <p
                      className={`text-xs font-bold uppercase tracking-[0.14em] ${severityTone(issue.severity)}`}
                    >
                      {issue.categoryLabel}
                      <span className="sr-only"> ({issue.category})</span>
                    </p>
                    <p className="mt-1 text-sm text-[var(--sf-muted)]">
                      {issue.help}
                    </p>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : null}

      {surface.overallState === "issues_detected" &&
      surface.hasMore &&
      loadMoreHref ? (
        <div className="mt-4">
          <Link
            href={loadMoreHref}
            className="watch-focus-ring inline-flex rounded-full border border-[var(--sf-line)] px-4 py-2 text-sm font-semibold text-[var(--sf-accent-strong)]"
          >
            Load older issues
          </Link>
        </div>
      ) : null}

      {!surface.repairActionsEnabled && !surface.bankRailsEnabled ? (
        <p className="mt-4 text-xs text-[var(--sf-faint)]">
          No repair, withdraw, or bank-connect actions while payout rails remain
          disabled.
        </p>
      ) : null}
    </section>
  );
}
