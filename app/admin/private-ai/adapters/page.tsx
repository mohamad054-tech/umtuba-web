import { getPrivateAiService } from "../../../../lib/privateAi";
import PrivateAiShell from "../PrivateAiShell";
import { requirePrivateAiAdmin } from "../requirePrivateAiAdmin";

export const metadata = { title: "Provider Adapters | UMTUBA" };

export default async function PrivateAiAdaptersPage() {
  await requirePrivateAiAdmin();
  const svc = getPrivateAiService();
  const adapters = svc
    .listProviderAdapters()
    .slice()
    .sort((a, b) => a.adapterId.localeCompare(b.adapterId));
  const failures = svc.listAdapterNormalizedFailures().slice(0, 20);
  const sample = svc.negotiateAdapter({
    providerId: "external-provider-contract",
    capabilityId: "reasoning",
    modelId: "pam_external_general_ref",
    runtimeKind: "external",
    allowContractTest: false,
  });

  return (
    <PrivateAiShell
      title="Adapters"
      subtitle="Provider Adapter Boundary V1"
    >
      <section className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h1 className="text-lg font-black">Adapter registry</h1>
          <p className="mt-2 text-sm text-white/50">
            Contracts and readiness only — no Gemini, OpenAI, local LLM, or
            inference invoke.
          </p>
          <p className="mt-3 text-xs text-white/45">
            Sample negotiation (external/reasoning):{" "}
            {sample.negotiation.ok
              ? `selected ${sample.negotiation.selectedAdapterId}`
              : `fail-closed (${sample.negotiation.reasons.join(", ") || "no_eligible"})`}
          </p>
        </div>

        {adapters.length === 0 ? (
          <p className="text-sm text-white/45">No adapters registered.</p>
        ) : (
          adapters.map((a) => (
            <article
              key={a.adapterId}
              className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7"
            >
              <h2 className="font-mono text-sm font-black">{a.adapterId}</h2>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Provider / kind
                  </dt>
                  <dd className="mt-1 text-xs">
                    {a.providerId} · {a.adapterKind}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Version / lifecycle
                  </dt>
                  <dd className="mt-1 text-xs">
                    {a.version} · {a.lifecycle}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Readiness
                  </dt>
                  <dd className="mt-1 text-xs">
                    {a.readiness.ready ? "ready" : "blocked"}
                    {a.readiness.blockers.length
                      ? ` · ${a.readiness.blockers.join(", ")}`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Flags
                  </dt>
                  <dd className="mt-1 text-xs">
                    enabled={String(a.enabled)} · available=
                    {String(a.available)} · production=
                    {String(a.productionEnabled)}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Capabilities / models / runtimes
                  </dt>
                  <dd className="mt-1 text-xs text-white/70">
                    caps: {a.supportedCapabilities.join(", ")}
                    <br />
                    models: {a.supportedModels.join(", ")}
                    <br />
                    runtimes: {a.supportedRuntimeKinds.join(", ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Streaming / structured
                  </dt>
                  <dd className="mt-1 text-xs">
                    stream={String(a.supportsStreaming)} · structured=
                    {String(a.supportsStructuredOutput)} · cancel=
                    {String(a.supportsCancellation)} · timeout=
                    {String(a.supportsTimeout)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Health
                  </dt>
                  <dd className="mt-1 text-xs">
                    {a.health.status} · {a.health.notes}
                  </dd>
                </div>
              </dl>
              {sample.negotiation.rejected
                .filter((r) => r.adapterId === a.adapterId)
                .map((r) => (
                  <p
                    key={`${r.adapterId}-rej`}
                    className="mt-3 text-xs text-rose-200/90"
                  >
                    Sample rejection: {r.reasons.join(", ")}
                  </p>
                ))}
            </article>
          ))
        )}

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="text-base font-black">
            Recent normalized failures
          </h2>
          {failures.length === 0 ? (
            <p className="mt-2 text-sm text-white/45">None recorded.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {failures.map((f, i) => (
                <li
                  key={`${f.class}-${f.code}-${i}`}
                  className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs"
                >
                  <span className="font-mono">{f.class}</span> · retryable=
                  {String(f.retryable)}
                  <p className="mt-1 text-white/70">{f.safeMessage}</p>
                  <p className="mt-1 text-white/40">{f.adminDiagnostic}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </PrivateAiShell>
  );
}
