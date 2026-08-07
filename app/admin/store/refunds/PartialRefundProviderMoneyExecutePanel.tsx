import { adminExecutePartialRefundProviderMoneyAction } from "../../../actions/storePartialRefundProviderMoneyExecution";
import {
  PARTIAL_REFUND_PROVIDER_MONEY_OPERATOR_ACK_FIELD,
  PARTIAL_REFUND_PROVIDER_MONEY_OPERATOR_ACK_VALUE,
  type FirstTimeProviderMoneyEligibilityCode,
} from "../../../../lib/store/partialRefundProviderMoneyExecution";

export type ProviderMoneyExecuteCandidate = {
  ledgerId: string;
  storeId: string;
  orderId: string;
  paymentAttemptId: string;
  refundAmountMinor: number;
  currency: string;
  ledgerStatus: string;
  eligibilityCode: FirstTimeProviderMoneyEligibilityCode;
  eligibleToExecute: boolean;
  recoveryRequired: boolean;
  eligibilityMessage: string;
  trustedPaymentIntentPresent: boolean;
};

type Props = {
  path: string;
  storeIdDefault: string;
  ledgerIdDefault: string;
  candidates: readonly ProviderMoneyExecuteCandidate[];
  loadError: string | null;
  firstTimeSubmitAllowed: boolean;
  executionMode: string;
  flashOk: boolean;
  flashStatus: string | null;
  flashError: string | null;
  flashLedgerId: string | null;
  flashExecutionId: string | null;
  flashSubmit: string | null;
};

function eligibilityLabel(code: FirstTimeProviderMoneyEligibilityCode): string {
  switch (code) {
    case "eligible":
      return "eligible to execute";
    case "gate_disabled":
    case "execution_mode_off":
      return "execution disabled by gate/mode";
    case "recovery_required":
      return "recovery required";
    case "already_succeeded":
      return "already succeeded";
    case "prior_failed_no_retry":
      return "prior failed (no V1 retry)";
    case "missing_provider_payment_ref":
      return "unsupported/missing provider reference";
    case "ledger_not_committed":
      return "ledger not committed";
    default:
      return code.replace(/_/g, " ");
  }
}

/**
 * First-time provider money execute control (P3).
 * Fail-closed: only shows submit when eligibility + gates permit.
 * Requires operator reason + exact ACK. Never exposes secrets.
 */
export default function PartialRefundProviderMoneyExecutePanel({
  path,
  storeIdDefault,
  ledgerIdDefault,
  candidates,
  loadError,
  firstTimeSubmitAllowed,
  executionMode,
  flashOk,
  flashStatus,
  flashError,
  flashLedgerId,
  flashExecutionId,
  flashSubmit,
}: Props) {
  return (
    <div
      className="mt-8 rounded-[28px] border border-rose-400/25 bg-[#080816]/80 p-5"
      data-testid="partial-refund-provider-money-execute-panel"
    >
      <h2 className="text-lg font-black text-rose-50">
        Provider money first-time execute
      </h2>
      <p className="mt-2 text-sm text-white/55">
        When enabled, this action submits a Stripe partial refund for a{" "}
        <strong className="font-semibold text-white/80">committed</strong> ledger
        reservation and may move provider money. Default execution mode is{" "}
        <span className="font-mono text-xs">off</span>. Production remains
        disabled unless execution mode, dual gates, and ACKs are explicitly set.
        Client PaymentIntent fields are never trusted.
      </p>

      <dl className="mt-3 grid max-w-3xl gap-2 text-xs text-zinc-400 sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Execution mode</dt>
          <dd className="font-mono text-zinc-200">{executionMode}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">First-time submit allowed</dt>
          <dd>{firstTimeSubmitAllowed ? "yes (env)" : "no (fail-closed)"}</dd>
        </div>
      </dl>

      {flashOk ? (
        <p
          role="status"
          className="mt-3 text-sm text-emerald-100"
          data-testid="pr-prov-exec-flash"
        >
          Execute: {flashStatus ?? "ok"}
          {flashLedgerId ? ` · ledger ${flashLedgerId}` : ""}
          {flashExecutionId ? ` · execution ${flashExecutionId}` : ""}
          {flashSubmit != null ? ` · submit=${flashSubmit}` : ""}
        </p>
      ) : null}
      {flashError ? (
        <p role="alert" className="mt-3 text-sm text-amber-100">
          {flashError}
        </p>
      ) : null}
      {loadError ? (
        <p role="alert" className="mt-3 text-sm text-red-100">
          {loadError}
        </p>
      ) : null}

      <form method="get" action={path} className="mt-4 flex flex-wrap gap-2 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-white/45">Store id</span>
          <input
            name="prProvStoreId"
            defaultValue={storeIdDefault}
            className="min-w-[18rem] rounded-xl border border-white/15 bg-black/40 px-3 py-2 font-mono text-xs"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-white/45">Ledger id (optional filter)</span>
          <input
            name="prProvExecLedgerId"
            defaultValue={ledgerIdDefault}
            className="min-w-[18rem] rounded-xl border border-white/15 bg-black/40 px-3 py-2 font-mono text-xs"
          />
        </label>
        <button
          type="submit"
          className="self-end rounded-xl border border-white/20 px-3 py-2 text-xs text-white"
        >
          Load execute candidates
        </button>
      </form>

      <ul className="mt-4 space-y-3 text-sm">
        {candidates.length === 0 ? (
          <li className="text-white/45">
            No execute candidates loaded. Provide store id (and optional ledger
            id) or load accounting review for committed reservations.
          </li>
        ) : (
          candidates.map((c) => (
            <li
              key={c.ledgerId}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
              data-testid="pr-prov-exec-candidate"
              data-eligibility={c.eligibilityCode}
              data-eligible={c.eligibleToExecute ? "1" : "0"}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-white">
                  {c.refundAmountMinor} {c.currency}
                </span>
                <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs uppercase tracking-wide text-zinc-300">
                  ledger {c.ledgerStatus}
                </span>
                <span className="text-xs text-rose-200/90">
                  {eligibilityLabel(c.eligibilityCode)}
                </span>
              </div>
              <p className="mt-1 text-xs text-white/45">
                ledger {c.ledgerId} · order {c.orderId} · payment{" "}
                {c.paymentAttemptId}
                {c.trustedPaymentIntentPresent
                  ? " · trusted PI resolvable"
                  : " · trusted PI missing"}
              </p>
              <p className="mt-1 text-xs text-white/40">{c.eligibilityMessage}</p>

              {c.eligibleToExecute ? (
                <form
                  action={adminExecutePartialRefundProviderMoneyAction}
                  className="mt-3 space-y-2"
                  data-testid="pr-prov-exec-form"
                >
                  <input type="hidden" name="storeId" value={c.storeId} />
                  <input type="hidden" name="ledgerId" value={c.ledgerId} />
                  <input type="hidden" name="returnTo" value={path} />
                  <p className="text-xs text-rose-100/80">
                    This submits a provider refund for {c.refundAmountMinor}{" "}
                    {c.currency} when gates are enabled.
                  </p>
                  <label className="block text-xs text-white/50">
                    Operator reason
                    <textarea
                      name="operatorReason"
                      required
                      minLength={3}
                      maxLength={500}
                      rows={2}
                      className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                      placeholder="Why this provider refund is being executed"
                    />
                  </label>
                  <label className="flex items-start gap-2 text-xs text-white/70">
                    <input
                      type="checkbox"
                      name={PARTIAL_REFUND_PROVIDER_MONEY_OPERATOR_ACK_FIELD}
                      value={PARTIAL_REFUND_PROVIDER_MONEY_OPERATOR_ACK_VALUE}
                      required
                      className="mt-0.5"
                    />
                    <span>
                      I acknowledge this action may move provider money when live
                      gates are enabled (
                      <span className="font-mono text-[10px]">
                        {PARTIAL_REFUND_PROVIDER_MONEY_OPERATOR_ACK_VALUE}
                      </span>
                      ).
                    </span>
                  </label>
                  <button
                    type="submit"
                    className="rounded-xl border border-rose-500/50 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-50"
                    data-first-time-execute="1"
                  >
                    Execute provider refund
                  </button>
                </form>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
