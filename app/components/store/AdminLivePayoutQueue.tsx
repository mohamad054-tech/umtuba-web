/**
 * Admin durable live payout queue (Slice S6).
 * Loads data only via S5 adminListLivePayoutExecutionsAction (passed from page).
 * Never calls orchestrator, booking helpers, UEOS, or Supabase directly.
 */

import type { SafeLivePayoutExecutionView } from "../../../lib/store/sellerLivePayout/actionSupport";
import { StatusChip } from "../../admin/store/AdminStoreShell";
import AdminLivePayoutAttestForm from "./AdminLivePayoutAttestForm";

export type AdminLivePayoutQueueProps = {
  executions: SafeLivePayoutExecutionView[];
  liveControlsEnabled: boolean;
  listError?: string | null;
};

function storeLabel(storeId: string): string {
  if (storeId.length <= 12) return storeId;
  return `${storeId.slice(0, 8)}…${storeId.slice(-4)}`;
}

export default function AdminLivePayoutQueue({
  executions,
  liveControlsEnabled,
  listError = null,
}: AdminLivePayoutQueueProps) {
  return (
    <div
      className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7"
      data-live-payout-queue="durable"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black tracking-tight">
            Live payout queue
          </h2>
          <p className="mt-1 text-sm text-white/50">
            Durable Manual Ops Live executions. Safe fields only.
          </p>
        </div>
        <span className="text-xs text-white/40">
          {executions.length} execution{executions.length === 1 ? "" : "s"}
        </span>
      </div>

      {listError ? (
        <p className="mt-4 text-sm text-rose-200" role="alert">
          {listError}
        </p>
      ) : null}

      {!liveControlsEnabled ? (
        <p
          className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-50/90"
          data-live-payout-controls="queue-disabled"
        >
          Production gate is off or incomplete — live execution controls are
          disabled.
        </p>
      ) : null}

      <ul className="mt-4 space-y-3">
        {executions.length === 0 && !listError ? (
          <li className="text-sm text-white/45">
            No durable live payout executions yet.
          </li>
        ) : (
          executions.map((ex) => (
            <li
              key={ex.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
              data-live-payout-execution={ex.id}
              data-live-payout-status={ex.status}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-white" dir="auto">
                  {ex.amountDisplay} {ex.currency}
                </span>
                <StatusChip status={ex.status} />
                {ex.status === "uncertain" ? (
                  <span
                    className="rounded-full border border-amber-400/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-100"
                    data-live-payout-badge="reconciliation-required"
                  >
                    Reconciliation required
                  </span>
                ) : null}
              </div>

              <dl className="mt-3 grid gap-2 text-xs text-white/55 sm:grid-cols-2">
                <div>
                  <dt className="uppercase tracking-wider text-white/35">
                    Execution
                  </dt>
                  <dd className="mt-0.5 font-mono text-white/75" dir="ltr">
                    {ex.id}
                  </dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wider text-white/35">
                    Store
                  </dt>
                  <dd className="mt-0.5 font-mono text-white/75" dir="ltr">
                    {storeLabel(ex.storeId)}
                  </dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wider text-white/35">
                    Provider
                  </dt>
                  <dd className="mt-0.5 text-cyan-200/80">{ex.providerId}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wider text-white/35">
                    Destination
                  </dt>
                  <dd className="mt-0.5" dir="auto">
                    {ex.destinationDisplayLabel ?? "Masked label unavailable"}
                  </dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wider text-white/35">
                    Created
                  </dt>
                  <dd className="mt-0.5" dir="ltr">
                    {ex.createdAt}
                  </dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wider text-white/35">
                    Updated
                  </dt>
                  <dd className="mt-0.5" dir="ltr">
                    {ex.updatedAt}
                  </dd>
                </div>
                {ex.failureCode || ex.failureMessageSafe ? (
                  <div className="sm:col-span-2">
                    <dt className="uppercase tracking-wider text-white/35">
                      Failure
                    </dt>
                    <dd className="mt-0.5 text-rose-200/80" dir="auto">
                      {[ex.failureCode, ex.failureMessageSafe]
                        .filter(Boolean)
                        .join(" — ")}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <AdminLivePayoutAttestForm
                execution={ex}
                liveControlsEnabled={liveControlsEnabled}
              />
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
