import { adminCompensateCommittedPartialRefundReservationAction } from "../../../actions/storePartialRefundCommittedCompensation";
import type { PartialRefundAccountingReviewModel } from "../../../../lib/store/partialRefundReservationAccounting";

type Props = {
  path: string;
  storeIdDefault: string;
  paymentAttemptIdDefault: string;
  review: PartialRefundAccountingReviewModel | null;
  loadError: string | null;
  flashOk: boolean;
  flashStatus: string | null;
  flashError: string | null;
  flashLedgerId: string | null;
  flashRestored: string | null;
  prefillLedgerId: string | null;
};

function isCompensationEligible(status: string): boolean {
  return status === "committed";
}

/**
 * Admin read-only partial-refund reservation accounting review
 * plus ACCOUNTING COMPENSATION ONLY controls for committed rows.
 */
export default function PartialRefundAccountingReviewPanel({
  path,
  storeIdDefault,
  paymentAttemptIdDefault,
  review,
  loadError,
  flashOk,
  flashStatus,
  flashError,
  flashLedgerId,
  flashRestored,
  prefillLedgerId,
}: Props) {
  const ledgerDefault = prefillLedgerId ?? flashLedgerId ?? "";

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
        movement has occurred. Compensation below restores accounting ceilings
        only (ACCOUNTING COMPENSATION ONLY).
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

      {flashOk ? (
        <p
          role="status"
          className="mt-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
          data-testid="pr-comp-success"
        >
          {flashStatus === "already_compensated"
            ? "Already compensated (idempotent) — accounting ceilings were not restored again."
            : "Accounting compensation applied — committed reservation ceilings restored."}
          {flashLedgerId ? ` Ledger ${flashLedgerId}.` : ""}
          {flashStatus ? ` Status: ${flashStatus}.` : ""}
          {flashRestored != null && flashStatus === "compensated"
            ? ` Restored amount (minor): ${flashRestored}.`
            : ""}{" "}
          Money moved: no. Provider refund: no. Restock: no.
        </p>
      ) : null}
      {flashError ? (
        <p
          role="alert"
          className="mt-3 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
          data-testid="pr-comp-error"
        >
          {flashStatus ? `[${flashStatus}] ` : ""}
          {flashError}
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
                {review.committedReservations.map((r) => {
                  const eligible = isCompensationEligible(r.status);
                  return (
                    <li
                      key={r.ledgerId}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2"
                      data-testid="pr-acct-history-row"
                      data-compensation-eligible={eligible ? "true" : "false"}
                      data-ledger-status={r.status}
                    >
                      <div className="font-semibold text-white/90">
                        Reserved {r.reservedAmountMinor} {r.currency} ·{" "}
                        {r.status}
                      </div>
                      <p className="mt-1 text-xs text-white/45">
                        ledger {r.ledgerId} · updated{" "}
                        {new Date(r.updatedAtIso).toLocaleString()} · not a
                        completed money refund
                      </p>
                      <p
                        className="mt-1 text-[11px] text-white/40"
                        data-testid={`pr-comp-eligibility-${r.ledgerId}`}
                      >
                        {eligible
                          ? "Eligible for ACCOUNTING COMPENSATION ONLY (restore ceilings)."
                          : `Not eligible for compensation (status: ${r.status}).`}
                      </p>
                      {eligible ? (
                        <form
                          action={
                            adminCompensateCommittedPartialRefundReservationAction
                          }
                          className="mt-3 space-y-2 rounded-xl border border-amber-400/20 bg-amber-500/5 p-3"
                          data-testid={`pr-comp-row-form-${r.ledgerId}`}
                        >
                          <input type="hidden" name="returnTo" value={path} />
                          <input
                            type="hidden"
                            name="ledgerId"
                            value={r.ledgerId}
                          />
                          <input
                            type="hidden"
                            name="expectedStoreId"
                            value={review.storeId}
                          />
                          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-100/90">
                            ACCOUNTING COMPENSATION ONLY
                          </p>
                          <p className="text-[11px] text-white/45">
                            Restores capture amount and line quantity ceilings.
                            Does not refund the buyer, call a payment provider,
                            restock inventory, adjust entitlements, unwind
                            settlement/commission, mutate payouts, cancel the
                            reservation via money path, or touch commerce
                            confirm.
                          </p>
                          <label className="block text-xs text-white/50">
                            Operator reason (required)
                            <textarea
                              name="operatorReason"
                              required
                              rows={2}
                              minLength={3}
                              maxLength={500}
                              placeholder="Why restore accounting ceilings for this committed reservation?"
                              className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                              data-testid={`pr-comp-row-reason-${r.ledgerId}`}
                            />
                          </label>
                          <button
                            type="submit"
                            className="rounded-xl border border-amber-300/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-50 hover:bg-amber-500/25"
                            data-testid={`pr-comp-row-submit-${r.ledgerId}`}
                          >
                            Compensate accounting ceilings
                          </button>
                        </form>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      <section
        className="mt-6 rounded-2xl border border-amber-400/25 bg-black/30 p-4"
        data-testid="pr-comp-manual-section"
      >
        <h3 className="text-sm font-black text-amber-50">
          Compensate by ledger id
        </h3>
        <p className="mt-1 text-xs text-white/50">
          ACCOUNTING COMPENSATION ONLY. Use for idempotent replay when a row is
          already compensated, or when you have a ledger id outside this review
          load. Invalid states are rejected by the service.
        </p>
        <form
          action={adminCompensateCommittedPartialRefundReservationAction}
          className="mt-3 space-y-3"
          data-testid="pr-comp-form"
        >
          <input type="hidden" name="returnTo" value={path} />
          <label className="block text-xs text-white/50">
            Ledger / commit id
            <input
              name="ledgerId"
              required
              defaultValue={ledgerDefault}
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
              data-testid="pr-comp-ledger-id"
            />
          </label>
          <label className="block text-xs text-white/50">
            Expected store id (ownership check)
            <input
              name="expectedStoreId"
              defaultValue={review?.storeId ?? storeIdDefault}
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
              data-testid="pr-comp-store-id"
            />
          </label>
          <label className="block text-xs text-white/50">
            Operator reason (required)
            <textarea
              name="operatorReason"
              required
              rows={2}
              minLength={3}
              maxLength={500}
              placeholder="Describe the accounting compensation reason"
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
              data-testid="pr-comp-reason"
            />
          </label>
          <button
            type="submit"
            className="rounded-xl border border-amber-300/40 bg-amber-500/15 px-4 py-2 text-sm font-bold text-amber-50 hover:bg-amber-500/25"
            data-testid="pr-comp-submit"
          >
            Run accounting compensation
          </button>
        </form>
      </section>
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
