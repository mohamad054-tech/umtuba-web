import { getPrivateAiService } from "../../../../lib/privateAi";
import PrivateAiShell from "../PrivateAiShell";
import { requirePrivateAiAdmin } from "../requirePrivateAiAdmin";

export const metadata = { title: "Private AI Runtime | UMTUBA" };

export default async function PrivateAiRuntimeDiagnosticsPage() {
  await requirePrivateAiAdmin();
  const svc = getPrivateAiService();
  const rows = svc.listRuntimeDiagnostics();
  const runtimes = svc.listRuntimes();

  return (
    <PrivateAiShell
      title="Runtime"
      subtitle="Deployment & Runtime V1 — diagnostics"
    >
      <section className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h1 className="text-lg font-black">Runtime diagnostics</h1>
          <p className="mt-2 text-sm text-white/50">
            Contract status only — no live pings, training, fine-tuning, or
            inference. {runtimes.length} runtime endpoint
            {runtimes.length === 1 ? "" : "s"} registered.
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-white/45">No runtimes registered.</p>
        ) : (
          rows.map((row) => (
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
                  <dd className="mt-1 text-white">{row.deploymentState}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Runtime
                  </dt>
                  <dd className="mt-1 text-white">{row.runtimeState}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Readiness
                  </dt>
                  <dd className="mt-1 text-white">
                    {row.readiness.ready
                      ? "ready"
                      : `blocked (${row.readiness.blockers.join(", ")})`}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Availability
                  </dt>
                  <dd className="mt-1 text-white">{row.availability}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Routing eligibility
                  </dt>
                  <dd className="mt-1 text-white">
                    {row.routingEligible ? "eligible" : "not eligible"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Health
                  </dt>
                  <dd className="mt-1 text-white">
                    {row.health.status}
                    {row.health.lastHeartbeatAt
                      ? ` · hb ${row.health.lastHeartbeatAt}`
                      : ""}
                  </dd>
                </div>
              </dl>
              {row.failureReasons.length > 0 ? (
                <p className="mt-3 text-sm text-rose-200/90">
                  Failure reasons: {row.failureReasons.join(" · ")}
                </p>
              ) : (
                <p className="mt-3 text-sm text-emerald-200/80">
                  No failure reasons recorded.
                </p>
              )}
              <p className="mt-2 text-xs text-white/40">
                Model {row.modelId}
                {row.health.lastFailureAt
                  ? ` · last failure ${row.health.lastFailureAt}`
                  : ""}
                {row.health.lastSuccessAt
                  ? ` · last success ${row.health.lastSuccessAt}`
                  : ""}
              </p>
            </article>
          ))
        )}
      </section>
    </PrivateAiShell>
  );
}
