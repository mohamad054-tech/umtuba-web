import { getPrivateAiService } from "../../../../lib/privateAi";
import PrivateAiShell from "../PrivateAiShell";
import { requirePrivateAiAdmin } from "../requirePrivateAiAdmin";
import {
  applyOverrideAction,
  clearOverrideAction,
  enterMaintenanceAction,
  exitMaintenanceAction,
  markRecoveredAction,
  markUnhealthyAction,
  recordHeartbeatAction,
  triggerFailoverAction,
} from "./actions";

export const metadata = { title: "Private AI Runtime Ops | UMTUBA" };

export default async function PrivateAiRuntimeOperationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; ok?: string }>;
}) {
  await requirePrivateAiAdmin();
  const params = (await searchParams) ?? {};
  const svc = getPrivateAiService();
  const rows = svc.listRuntimeDiagnostics();
  const policy = svc.getRuntimeOpsPolicy();

  return (
    <PrivateAiShell
      title="Runtime"
      subtitle="Runtime Operations & Failover V1"
    >
      <section className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h1 className="text-lg font-black">Runtime operations</h1>
          <p className="mt-2 text-sm text-white/50">
            Heartbeats, failover, recovery, and maintenance — contracts only.
            No live pings, cron, workers, training, or inference.
          </p>
          <p className="mt-3 text-xs text-white/40">
            Policy: miss {policy.missedHeartbeatMs}ms · fail×
            {policy.consecutiveFailureThreshold} · recover×
            {policy.consecutiveSuccessThreshold} · cooldown {policy.cooldownMs}
            ms
          </p>
          {params.ok ? (
            <p className="mt-3 text-sm text-emerald-300">Operation applied.</p>
          ) : null}
          {params.error ? (
            <p className="mt-3 text-sm text-rose-300">{params.error}</p>
          ) : null}
        </div>

        {rows.map((row) => (
          <article
            key={row.runtimeId}
            className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7"
          >
            <h2 className="font-black">{row.label}</h2>
            <p className="mt-1 font-mono text-[11px] text-blue-100/80">
              {row.runtimeId}
            </p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                  Deployment
                </dt>
                <dd className="mt-1">{row.deploymentState}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                  Health
                </dt>
                <dd className="mt-1">{row.health.status}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                  Last heartbeat
                </dt>
                <dd className="mt-1">{row.lastHeartbeatAt ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                  Failures / successes
                </dt>
                <dd className="mt-1">
                  {row.consecutiveFailures} / {row.consecutiveSuccesses}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                  Routing
                </dt>
                <dd className="mt-1">
                  {row.routingEligible ? "eligible" : "blocked"}
                  {row.maintenanceActive ? " · maintenance" : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                  Failover / cooldown
                </dt>
                <dd className="mt-1">
                  {row.activeFailoverTargetId ?? "—"}
                  {row.cooldownUntil ? ` · cool ${row.cooldownUntil}` : ""}
                </dd>
              </div>
            </dl>

            {row.activeIncident ? (
              <p className="mt-3 text-sm text-amber-200/90">
                Active incident: {row.activeIncident.type} —{" "}
                {row.activeIncident.reason}
              </p>
            ) : null}

            {row.recentIncidents.length > 0 ? (
              <ul className="mt-3 space-y-1 text-xs text-white/45">
                {row.recentIncidents.map((inc) => (
                  <li key={inc.id}>
                    {inc.timestamp} · {inc.type} · {inc.reason}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {row.allowedOpsActions.includes("record_heartbeat") ? (
                <form action={recordHeartbeatAction} className="space-y-2">
                  <input type="hidden" name="runtimeId" value={row.runtimeId} />
                  <button
                    type="submit"
                    className="w-full rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold"
                  >
                    Record heartbeat
                  </button>
                </form>
              ) : null}

              {row.allowedOpsActions.includes("mark_unhealthy") ? (
                <form action={markUnhealthyAction} className="space-y-2">
                  <input type="hidden" name="runtimeId" value={row.runtimeId} />
                  <input
                    name="reason"
                    required
                    placeholder="Reason"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-bold"
                  >
                    Mark unhealthy
                  </button>
                </form>
              ) : null}

              {row.allowedOpsActions.includes("enter_maintenance") ? (
                <form action={enterMaintenanceAction} className="space-y-2">
                  <input type="hidden" name="runtimeId" value={row.runtimeId} />
                  <input
                    name="reason"
                    required
                    placeholder="Maintenance reason"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-bold"
                  >
                    Enter maintenance
                  </button>
                </form>
              ) : null}

              {row.allowedOpsActions.includes("exit_maintenance") ? (
                <form action={exitMaintenanceAction} className="space-y-2">
                  <input type="hidden" name="runtimeId" value={row.runtimeId} />
                  <input
                    name="reason"
                    required
                    placeholder="Exit reason"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold"
                  >
                    Exit maintenance
                  </button>
                </form>
              ) : null}

              {row.allowedOpsActions.includes("trigger_failover") ? (
                <form action={triggerFailoverAction} className="space-y-2">
                  <input type="hidden" name="runtimeId" value={row.runtimeId} />
                  <input
                    name="reason"
                    required
                    placeholder="Failover reason"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-xs font-bold"
                  >
                    Trigger failover
                  </button>
                </form>
              ) : null}

              {row.allowedOpsActions.includes("mark_recovered") ? (
                <form action={markRecoveredAction} className="space-y-2">
                  <input type="hidden" name="runtimeId" value={row.runtimeId} />
                  <input
                    name="reason"
                    required
                    placeholder="Recovery reason"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold"
                  >
                    Mark recovered
                  </button>
                </form>
              ) : null}

              {row.allowedOpsActions.includes("apply_override") ? (
                <form action={applyOverrideAction} className="space-y-2">
                  <input type="hidden" name="runtimeId" value={row.runtimeId} />
                  <input type="hidden" name="mode" value="block_failover" />
                  <input
                    name="reason"
                    required
                    placeholder="Override reason"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold"
                  >
                    Apply block-failover override
                  </button>
                </form>
              ) : null}

              {row.allowedOpsActions.includes("clear_override") ? (
                <form action={clearOverrideAction} className="space-y-2">
                  <input type="hidden" name="runtimeId" value={row.runtimeId} />
                  <input
                    name="reason"
                    required
                    placeholder="Clear reason"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold"
                  >
                    Clear override
                  </button>
                </form>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </PrivateAiShell>
  );
}
