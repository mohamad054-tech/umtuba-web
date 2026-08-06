import type { PartialRefundAccountingReviewModel } from "../../../../lib/store/partialRefundReservationAccounting";

type Props = {
  path: string;
  storeIdDefault: string;
  paymentAttemptIdDefault: string;
  review: PartialRefundAccountingReviewModel | null;
  loadError: string | null;
};

/**
 * Admin read-only partial-refund reservation accounting review.
 * Does not create, cancel, or execute refunds.
 */
export default function PartialRefundAccountingReviewPanel({
  path,
  storeIdDefault,
  paymentAttemptIdDefault,
  review,
  loadError,
}: Props) {
  return (
    <div
      className="rounded-[28px] border border-sky-400/25 bg-[#080816]/80 p-5"
      data-testid="partial-refund-accounting-review-panel"
    >
      <h2 className="text-lg font-black text-sky-50">
        Partial refund reservation accounting
      </h2>
      <p className="mt-2 text-sm text-white/55">
        Read-only review of capture accounting and committed ledger
        reservations. Ledger reservation only — no provider refund or money
        movement has occurred.
      </p>

      <form method="get" action={path} className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="block text-xs text-white/50">
          Store id
          <input
            name="prAcctStoreId"
            defaultValue={storeIdDefault}
            required
            className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-white/50">
          Payment attempt id
          <input
            name="prAcctPaymentAttemptId"
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
            Load accounting review
          </button>
        </div>
      </form>

      {loadError ? (
        <p
          role="alert"
          className="mt-3 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
          data-testid="pr-acct-error"
        >
          {loadError}
        </p>
      ) : null}

      {review ? (
        <div className="mt-5 space-y-4" data-testid="pr-acct-review">
          <p
            role="status"
            className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-50"
          >
            Ledger reservation only — no provider refund or money movement has
            occurred.
          </p>
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Capture amount"
              value={`${review.captureAmountMinor} ${review.currency}`}
            />
            <Stat
              label="Committed reserved"
              value={`${review.committedReservationAmountMinor} ${review.currency}`}
            />
            <Stat
              label="Remaining reservable"
              value={`${review.remainingReservableAmountMinor} ${review.currency}`}
            />
            <Stat
              label="Accounting version"
              value={String(review.accountingVersion)}
            />
          </dl>
          <p className="text-xs text-white/40">
            Capture {review.captureEventId} · order {review.orderId}
            {review.captureAccountingPresent
              ? ""
              : " · no durable accounting row yet (remaining equals full capture)"}
          </p>

          <div>
            <h3 className="text-sm font-bold text-white/80">Line quantities</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {review.lines.map((line) => (
                <li
                  key={line.orderItemId}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2"
                  data-testid="pr-acct-line"
                >
                  <span className="font-medium text-white/85">
                    {line.titleSnapshot}
                  </span>
                  <span className="mt-1 block text-xs text-white/45">
                    purchased {line.purchasedQuantity} · reserved{" "}
                    {line.committedReservedQuantity} · remaining{" "}
                    {line.remainingReservableQuantity}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white/80">
              Committed reservation history
            </h3>
            {review.committedReservations.length === 0 ? (
              <p className="mt-2 text-sm text-white/45">
                No committed ledger reservations for this capture.
              </p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {review.committedReservations.map((r) => (
                  <li
                    key={r.ledgerId}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2"
                    data-testid="pr-acct-history-row"
                  >
                    <div className="font-semibold text-white/90">
                      Reserved {r.reservedAmountMinor} {r.currency} · {r.status}
                    </div>
                    <p className="mt-1 text-xs text-white/45">
                      ledger {r.ledgerId} · updated{" "}
                      {new Date(r.updatedAtIso).toLocaleString()} · not a
                      completed money refund
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-white/40">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-white/90">{value}</dd>
    </div>
  );
}
