import type { SellerPayoutEligibilitySurfaceView } from "../../../lib/store/sellerPayoutEligibilitySurface";
import SellerPayoutDestinationForm from "./SellerPayoutDestinationForm";
import SellerPayoutRequestButton from "./SellerPayoutRequestButton";

type Props = {
  surface: SellerPayoutEligibilitySurfaceView;
  /** Owner/manager only — other roles must not see payout controls. */
  canManagePayouts: boolean;
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
    case "live_payout_gate_off":
      return "Live payouts unavailable";
    case "live_payout_ready":
      return "Live payout path ready";
    case "destination_missing":
      return "Destination required";
    case "destination_unverified":
      return "Destination pending review";
    case "payout_in_transit":
      return "Payout in transit";
    case "payout_completed_readonly":
      return "Completed payout (read-only)";
    default:
      return highlight;
  }
}

/**
 * Seller-facing payout eligibility + optional live destination/request controls.
 */
export default function SellerPayoutEligibility({
  surface,
  canManagePayouts,
}: Props) {
  const showLiveControls =
    canManagePayouts && surface.overallState === "ready";

  return (
    <section
      className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5"
      aria-labelledby="seller-payout-eligibility-heading"
      data-capability={surface.capability}
      data-overall-state={surface.overallState}
      data-payout-execution={
        surface.payoutExecutionEnabled ? "enabled" : "disabled"
      }
      data-request-allowed={surface.requestPayoutAllowed ? "true" : "false"}
    >
      <h2
        id="seller-payout-eligibility-heading"
        className="sf-display text-xl font-semibold tracking-tight"
      >
        Payout eligibility
      </h2>
      <p className="mt-1 text-sm text-[var(--sf-faint)]">
        Trusted status only. Amounts and settlement are derived on the server.
        {!surface.payoutExecutionEnabled
          ? " Live payout requests stay unavailable until the production gate is ready."
          : " Manual Ops Live destination and request controls appear below for owners and managers."}
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
                  h === "eligible_balance_available" || h === "live_payout_ready"
                    ? "border-[var(--sf-ok)]/40 text-[var(--sf-ok)]"
                    : h === "bank_rails_disabled" || h === "live_payout_gate_off"
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
                  <dd className="mt-1 text-sm text-[var(--sf-muted)]" dir="auto">
                    Available {bucket.availableLabel}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </>
      ) : null}

      {!surface.payoutExecutionEnabled ? (
        <p
          className="mt-4 text-xs text-[var(--sf-faint)]"
          data-live-payout-disabled-message="honest"
        >
          No withdraw or bank-connect actions while the live payout path remains
          unavailable. Traditional bank rails stay disabled.
        </p>
      ) : null}

      {showLiveControls ? (
        <>
          <SellerPayoutDestinationForm
            storeId={surface.storeId}
            destinations={surface.destinations}
            enabled={canManagePayouts}
          />
          <SellerPayoutRequestButton
            storeId={surface.storeId}
            destinationId={surface.verifiedDestinationId}
            candidates={surface.requestCandidates}
            requestAllowed={surface.requestPayoutAllowed}
            blockReason={surface.livePayoutBlockReason}
            inTransitCaptureCount={surface.inTransitCaptureCount}
          />
        </>
      ) : null}

      {!canManagePayouts && surface.overallState === "ready" ? (
        <p
          className="mt-4 text-xs text-[var(--sf-faint)]"
          data-seller-payout-controls="hidden-role"
        >
          Payout destination and request controls are limited to store owners
          and managers.
        </p>
      ) : null}
    </section>
  );
}
