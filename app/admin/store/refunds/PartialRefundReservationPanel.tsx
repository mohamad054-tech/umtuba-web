import { adminRequestPartialRefundReservationAction } from "../../../actions/storePartialRefundReservation";
import type { PartialRefundReservationSafeCommitView } from "../../../../lib/store/partialRefundReservation";
import type { TrustedPartialRefundFactLoadResult } from "../../../../lib/store/partialRefundReservation";

type Props = {
  path: string;
  storeIdDefault: string;
  paymentAttemptIdDefault: string;
  facts: TrustedPartialRefundFactLoadResult | null;
  reservations: readonly PartialRefundReservationSafeCommitView[];
  flashStatus: string | null;
  flashError: string | null;
  flashOk: boolean;
  flashLedgerId: string | null;
};

/**
 * Admin partial-refund ledger reservation panel.
 * Clearly labeled as reservation-only — not a completed money refund.
 */
export default function PartialRefundReservationPanel({
  path,
  storeIdDefault,
  paymentAttemptIdDefault,
  facts,
  reservations,
  flashStatus,
  flashError,
  flashOk,
  flashLedgerId,
}: Props) {
  return (
    <div
      className="rounded-[28px] border border-amber-400/25 bg-[#080816]/80 p-5"
      data-testid="partial-refund-reservation-panel"
    >
      <h2 className="text-lg font-black text-amber-50">
        Partial refund ledger reservation
      </h2>
      <p className="mt-2 text-sm text-white/55">
        Creates a durable ledger reservation only. This does not execute a
        provider refund, move money, restock inventory, adjust entitlement, or
        unwind settlement/commission. Provider refund execution is unsupported
        here.
      </p>

      {flashOk ? (
        <p
          role="status"
          className="mt-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
          data-testid="pr-reservation-success"
        >
          Ledger reservation{" "}
          {flashStatus === "reservation_replayed" ? "replayed" : "committed"}
          {flashLedgerId ? ` (${flashLedgerId})` : ""}. Provider refund: not
          performed. Money moved: no.
        </p>
      ) : null}
      {flashError ? (
        <p
          role="alert"
          className="mt-3 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
          data-testid="pr-reservation-error"
        >
          {flashStatus ? `[${flashStatus}] ` : ""}
          {flashError}
        </p>
      ) : null}

      <form method="get" action={path} className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="block text-xs text-white/50">
          Store id
          <input
            name="prStoreId"
            defaultValue={storeIdDefault}
            required
            className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-white/50">
          Payment attempt id
          <input
            name="prPaymentAttemptId"
            defaultValue={paymentAttemptIdDefault}
            required
            className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            Load trusted lines
          </button>
        </div>
      </form>

      {facts && !facts.ok ? (
        <p className="mt-3 text-sm text-red-200/90" role="alert">
          {facts.message}
        </p>
      ) : null}

      {facts && facts.ok ? (
        <form
          action={adminRequestPartialRefundReservationAction}
          className="mt-5 space-y-3"
          data-testid="pr-reservation-request-form"
        >
          <input type="hidden" name="returnTo" value={path} />
          <input type="hidden" name="storeId" value={facts.capture.storeId} />
          <input
            type="hidden"
            name="paymentAttemptId"
            value={facts.capture.paymentAttemptId}
          />
          <p className="text-xs text-white/45">
            Capture {facts.capture.captureEventId} · order{" "}
            {facts.capture.orderId} · currency derived server-side (
            {facts.capture.currency}). No money amount input is accepted.
          </p>
          <ul className="space-y-2">
            {facts.selectableLines.map((line) => (
              <li
                key={line.orderItemId}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
              >
                <input
                  type="hidden"
                  name="orderItemId"
                  value={line.orderItemId}
                />
                <span className="min-w-[12rem] flex-1 font-medium text-white/85">
                  {line.titleSnapshot}
                </span>
                <span className="text-xs text-white/40">
                  purchased {line.purchasedQuantity}
                </span>
                <label className="text-xs text-white/50">
                  Reserve qty
                  <input
                    name="requestedQuantity"
                    type="number"
                    min={0}
                    max={line.purchasedQuantity}
                    defaultValue={0}
                    className="ml-2 w-20 rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-sm text-white"
                    data-testid="pr-qty-input"
                  />
                </label>
              </li>
            ))}
          </ul>
          <p className="text-xs text-white/40">
            Set quantity to 0 to skip a line. Amounts are computed only from
            trusted unit prices × quantity on the server.
          </p>
          <button
            type="submit"
            className="rounded-xl border border-amber-300/40 bg-amber-500/15 px-4 py-2 text-sm font-bold text-amber-50 hover:bg-amber-500/25"
            data-testid="pr-create-reservation"
          >
            Create ledger reservation
          </button>
        </form>
      ) : null}

      <div className="mt-6">
        <h3 className="text-sm font-bold text-white/80">
          Committed reservations (ledger only)
        </h3>
        {reservations.length === 0 ? (
          <p className="mt-2 text-sm text-white/45">
            No committed ledger reservations for this capture.
          </p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {reservations.map((r) => (
              <li
                key={r.ledgerId}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2"
                data-testid="pr-reservation-row"
              >
                <div className="font-semibold text-white/90">
                  Reserved {r.reservedAmountMinor} {r.currency} · {r.status}
                </div>
                <p className="mt-1 text-xs text-white/45">
                  ledger {r.ledgerId} · provider refund not performed · money
                  not moved
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
