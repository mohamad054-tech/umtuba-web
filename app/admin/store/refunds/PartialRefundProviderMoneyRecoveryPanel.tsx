import { adminRecoverPartialRefundProviderMoneyLookupAction } from "../../../actions/storePartialRefundProviderMoneyExecution";
import type { PartialRefundProviderExecutionRecord } from "../../../../lib/store/partialRefundProviderMoneyExecution";
import {
  buildProviderMoneyOperatorObservability,
  buildRefundProviderReconciliation,
  isRecoveryEligibleProviderExecution,
  PARTIAL_REFUND_PROVIDER_STALE_EXECUTING_MS,
  toProviderMoneyAuditView,
} from "../../../../lib/store/partialRefundProviderMoneyExecution";

type Props = {
  path: string;
  storeIdDefault: string;
  executions: readonly PartialRefundProviderExecutionRecord[];
  loadError: string | null;
  flashOk: boolean;
  flashStatus: string | null;
  flashError: string | null;
  flashLedgerId: string | null;
  flashExecutionId: string | null;
  nowMs?: number;
};

/**
 * Admin recovery/review for uncertain or stale-executing provider executions.
 * Recovery = LOOKUP only. First-time execute remains fail-closed behind gates.
 */
export default function PartialRefundProviderMoneyRecoveryPanel({
  path,
  storeIdDefault,
  executions,
  loadError,
  flashOk,
  flashStatus,
  flashError,
  flashLedgerId,
  flashExecutionId,
  nowMs,
}: Props) {
  const now = nowMs ?? Date.now();

  return (
    <div
      className="mt-8 rounded-[28px] border border-amber-400/25 bg-[#080816]/80 p-5"
      data-testid="partial-refund-provider-money-recovery-panel"
    >
      <h2 className="text-lg font-black text-amber-50">
        Provider money recovery (lookup only)
      </h2>
      <p className="mt-2 text-sm text-white/55">
        Review uncertain or stale executing executions. Recovery calls provider
        lookup only — never submit, never compensate, never restock/settlement.
        First-time execute remains fail-closed behind dual gates + execution
        mode (default off). Safe audit fields only — no secrets or raw provider
        payloads.
      </p>

      {flashOk ? (
        <p
          role="status"
          className="mt-3 text-sm text-emerald-100"
          data-testid="pr-prov-rec-flash"
        >
          Recovery: {flashStatus ?? "ok"}
          {flashLedgerId ? ` · ledger ${flashLedgerId}` : ""}
          {flashExecutionId ? ` · execution ${flashExecutionId}` : ""}
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
        <button
          type="submit"
          className="self-end rounded-xl border border-white/20 px-3 py-2 text-xs text-white"
        >
          Load executions
        </button>
      </form>

      <ul className="mt-4 space-y-3 text-sm">
        {executions.length === 0 ? (
          <li className="text-white/45">No provider executions loaded.</li>
        ) : (
          executions.map((e) => {
            const eligible = isRecoveryEligibleProviderExecution(
              e,
              now,
              PARTIAL_REFUND_PROVIDER_STALE_EXECUTING_MS
            );
            const audit = toProviderMoneyAuditView(e);
            const obs = buildProviderMoneyOperatorObservability({
              execution: e,
              nowMs: now,
              staleAfterMs: PARTIAL_REFUND_PROVIDER_STALE_EXECUTING_MS,
            });
            const recon = buildRefundProviderReconciliation({
              execution: e,
              nowMs: now,
              staleAfterMs: PARTIAL_REFUND_PROVIDER_STALE_EXECUTING_MS,
            });
            return (
              <li
                key={e.executionId}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                data-testid="pr-prov-exec-row"
                data-status={e.status}
                data-recovery-eligible={eligible ? "1" : "0"}
                data-latest-operation={audit.latestOperation}
                data-money-occurrence={obs.moneyExecutionOccurrence}
                data-retry-safe={obs.retrySafe ? "1" : "0"}
                data-execution-stuck={obs.executionStuck ? "1" : "0"}
                data-duplicate-ruled-out={
                  obs.duplicateExecutionRuledOut ? "1" : "0"
                }
                data-recon-match={recon.MATCH_STATUS}
                data-recon-required={recon.RECONCILIATION_REQUIRED ? "1" : "0"}
                data-operator-action-required={
                  recon.OPERATOR_ACTION_REQUIRED ? "1" : "0"
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-white">
                    {audit.amountMinor} {audit.currency}
                  </span>
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs uppercase tracking-wide text-zinc-300">
                    {audit.status}
                  </span>
                  <span className="rounded-full border border-sky-400/30 px-2 py-0.5 text-xs uppercase tracking-wide text-sky-100">
                    last op {audit.latestOperation}
                  </span>
                  {eligible ? (
                    <span className="text-xs text-amber-200">
                      recovery-required
                    </span>
                  ) : null}
                  {obs.executionStuck ? (
                    <span className="text-xs text-rose-200">stuck executing</span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-white/45">
                  execution {audit.executionId} · ledger {audit.ledgerId} ·
                  store {audit.storeId} · order {audit.orderId}
                </p>
                <p className="mt-1 font-mono text-[11px] text-white/40">
                  idempotency {audit.idempotencyKey} · provider{" "}
                  {audit.providerKind}
                  {audit.providerRefundId
                    ? ` · refund ${audit.providerRefundId}`
                    : ""}
                  {audit.providerStatusSafe
                    ? ` · status ${audit.providerStatusSafe}`
                    : ""}
                  {audit.failureCode ? ` · ${audit.failureCode}` : ""}
                </p>
                <p className="mt-1 text-[11px] text-white/35">
                  created {audit.createdAtIso}
                  {audit.startedAtIso ? ` · started ${audit.startedAtIso}` : ""}
                  {audit.completedAtIso
                    ? ` · completed ${audit.completedAtIso}`
                    : ""}
                  {audit.lastLookupAtIso
                    ? ` · last lookup ${audit.lastLookupAtIso}`
                    : ""}
                </p>
                <dl
                  className="mt-2 grid gap-1 text-[11px] text-white/45 sm:grid-cols-2"
                  data-testid="pr-prov-operator-observability"
                >
                  <div>
                    <dt className="text-white/35">Submit attempted</dt>
                    <dd className="text-white/70">
                      {obs.providerSubmissionAttempted ? "yes" : "no"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/35">Money occurrence</dt>
                    <dd className="text-white/70">
                      {obs.moneyExecutionOccurrence}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/35">Retry safe (V1)</dt>
                    <dd className="text-white/70">
                      {obs.retrySafe ? "yes" : "no"} · {obs.retrySafety}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/35">Reconciliation</dt>
                    <dd className="text-white/70">
                      {obs.reconciliationRequired
                        ? "required"
                        : "not required"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/35">Duplicate ruled out</dt>
                    <dd className="text-white/70">
                      {obs.duplicateExecutionRuledOut ? "yes" : "no"} ·{" "}
                      {obs.duplicateExecutionRuling}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/35">Recovery evidence</dt>
                    <dd className="text-white/70">
                      {obs.recoveryEvidence.recoveryEligible
                        ? "lookup eligible"
                        : "not eligible"}
                      {obs.recoveryEvidence.failureCode
                        ? ` · ${obs.recoveryEvidence.failureCode}`
                        : ""}
                    </dd>
                  </div>
                </dl>
                <dl
                  className="mt-2 grid gap-1 text-[11px] text-amber-100/70 sm:grid-cols-2"
                  data-testid="pr-prov-reconciliation"
                >
                  <div>
                    <dt className="text-white/35">LOCAL_STATE</dt>
                    <dd className="text-white/70">{recon.LOCAL_STATE}</dd>
                  </div>
                  <div>
                    <dt className="text-white/35">PROVIDER_STATE</dt>
                    <dd className="text-white/70">{recon.PROVIDER_STATE}</dd>
                  </div>
                  <div>
                    <dt className="text-white/35">MATCH_STATUS</dt>
                    <dd className="text-white/70">{recon.MATCH_STATUS}</dd>
                  </div>
                  <div>
                    <dt className="text-white/35">RECONCILIATION_REQUIRED</dt>
                    <dd className="text-white/70">
                      {recon.RECONCILIATION_REQUIRED ? "yes" : "no"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/35">RETRY_SAFE</dt>
                    <dd className="text-white/70">
                      {recon.RETRY_SAFE ? "yes" : "no"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/35">OPERATOR_ACTION_REQUIRED</dt>
                    <dd className="text-white/70">
                      {recon.OPERATOR_ACTION_REQUIRED ? "yes" : "no"} ·{" "}
                      {recon.operatorAction}
                    </dd>
                  </div>
                </dl>
                {eligible ? (
                  <form
                    action={adminRecoverPartialRefundProviderMoneyLookupAction}
                    className="mt-3"
                  >
                    <input type="hidden" name="storeId" value={e.storeId} />
                    <input
                      type="hidden"
                      name="executionId"
                      value={e.executionId}
                    />
                    <input type="hidden" name="ledgerId" value={e.ledgerId} />
                    <input type="hidden" name="returnTo" value={path} />
                    <button
                      type="submit"
                      className="rounded-xl border border-amber-500/40 px-3 py-1.5 text-xs text-amber-50"
                      data-recovery-lookup-only="1"
                    >
                      Run recovery lookup
                    </button>
                  </form>
                ) : null}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
