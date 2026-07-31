import {
  evaluateProviderRouting,
  getPrivateAiService,
} from "../../../../lib/privateAi";
import PrivateAiShell from "../PrivateAiShell";
import { requirePrivateAiAdmin } from "../requirePrivateAiAdmin";

export const metadata = {
  title: "Provider Routing Policy | UMTUBA",
};

export default async function PrivateAiProviderRoutingPage() {
  await requirePrivateAiAdmin();
  const svc = getPrivateAiService();
  const policy = svc.getProviderRoutingPolicy();
  const providers = [...policy.providers].sort(
    (a, b) => a.priority - b.priority || a.id.localeCompare(b.id)
  );
  const latest = svc.listProviderRoutingEvaluations()[0] ?? null;
  const evaluation =
    latest ??
    evaluateProviderRouting(svc.getState(), {
      capabilityId: "reasoning",
      tenantId: "tenant_umtuba",
    });

  return (
    <PrivateAiShell
      title="Provider routing"
      subtitle="Provider Routing Policy V1"
    >
      <section className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h1 className="text-lg font-black">Provider routing policy</h1>
          <p className="mt-2 text-sm text-white/50">
            Decision contracts only — no Gemini, no provider calls, no
            inference.
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                Policy version
              </dt>
              <dd className="mt-1 font-mono text-xs">{policy.version}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                Preferred / override
              </dt>
              <dd className="mt-1 text-xs text-white/70">
                preferred={policy.preferredProviderId ?? "—"} · override=
                {policy.manualOverrideProviderId ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                Lists
              </dt>
              <dd className="mt-1 text-xs text-white/70">
                whitelist=
                {policy.whitelist ? policy.whitelist.join(", ") : "all"} ·
                blacklist=
                {policy.blacklist.length
                  ? policy.blacklist.join(", ")
                  : "none"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                Preferences
              </dt>
              <dd className="mt-1 text-xs text-white/70">
                cost={policy.preferCostTier ?? "—"} · max=
                {policy.maxCostTier ?? "—"} · region=
                {policy.preferRegion ?? "—"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="text-base font-black">Providers (priority order)</h2>
          <ul className="mt-4 divide-y divide-white/10">
            {providers.map((p, index) => (
              <li key={p.id} className="py-3">
                <p className="font-semibold">
                  #{index + 1} · {p.label}{" "}
                  <span className="font-mono text-xs text-white/45">
                    ({p.id})
                  </span>
                </p>
                <p className="mt-1 text-[11px] text-white/45">
                  priority {p.priority} · {p.costTier} · regions{" "}
                  {p.regions.join(", ") || "—"} · caps{" "}
                  {p.capabilities.join(", ")} ·{" "}
                  {p.enabled ? "enabled" : "disabled"}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="text-base font-black">Latest policy evaluation</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                Selected provider
              </dt>
              <dd className="mt-1 font-mono text-xs">
                {evaluation.selectedProviderId ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                Selected runtime
              </dt>
              <dd className="mt-1 font-mono text-xs">
                {evaluation.selectedRuntimeId ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                Selection reason
              </dt>
              <dd className="mt-1">{evaluation.selectionReason}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                Confidence
              </dt>
              <dd className="mt-1">{evaluation.confidence}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                Fallback chain
              </dt>
              <dd className="mt-1 font-mono text-xs text-white/70">
                {evaluation.fallbackChain.length
                  ? evaluation.fallbackChain.join(" → ")
                  : "—"}
              </dd>
            </div>
          </dl>

          <h3 className="mt-6 text-sm font-bold text-white/80">
            Rejected candidates
          </h3>
          {evaluation.rejected.length === 0 ? (
            <p className="mt-2 text-sm text-white/45">None rejected.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {evaluation.rejected.map((r) => (
                <li
                  key={`${r.providerId}-${r.runtimeId ?? "none"}-${r.reasons.join("|")}`}
                  className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs"
                >
                  <span className="font-mono">{r.providerId}</span>
                  {r.runtimeId ? (
                    <span className="text-white/40"> · {r.runtimeId}</span>
                  ) : null}
                  <p className="mt-1 text-rose-200/90">
                    {r.reasons.join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </PrivateAiShell>
  );
}
