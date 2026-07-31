import { getPrivateAiService } from "../../../../lib/privateAi";
import PrivateAiShell from "../PrivateAiShell";
import { requirePrivateAiAdmin } from "../requirePrivateAiAdmin";

export const metadata = { title: "Private AI Inference Requests | UMTUBA" };

export default async function PrivateAiInferenceRequestsPage() {
  await requirePrivateAiAdmin();
  const svc = getPrivateAiService();
  const requests = svc
    .listInferenceRequests()
    .slice()
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 50);

  return (
    <PrivateAiShell
      title="Inference"
      subtitle="Inference Request Contracts V1"
    >
      <section className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h1 className="text-lg font-black">Inference requests</h1>
          <p className="mt-2 text-sm text-white/50">
            Request contracts, validation, and lifecycle only — no model
            execution, streaming transport, or provider calls.
          </p>
          <p className="mt-3 text-xs text-white/40">
            Showing {requests.length} most recent request
            {requests.length === 1 ? "" : "s"}.
          </p>
        </div>

        {requests.length === 0 ? (
          <p className="text-sm text-white/45">No inference requests recorded.</p>
        ) : (
          requests.map((req) => (
            <article
              key={req.requestId}
              className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7"
            >
              <h2 className="font-mono text-sm font-black">{req.requestId}</h2>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Status
                  </dt>
                  <dd className="mt-1">{req.lifecycle}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Capability
                  </dt>
                  <dd className="mt-1">{req.capabilityId}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Runtime
                  </dt>
                  <dd className="mt-1">{req.runtimeId ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Provider
                  </dt>
                  <dd className="mt-1">{req.providerId ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Model
                  </dt>
                  <dd className="mt-1">{req.modelId ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Tenant / role
                  </dt>
                  <dd className="mt-1">
                    {req.requester.tenantId} · {req.requester.role}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Streaming / structured
                  </dt>
                  <dd className="mt-1">
                    {req.streaming.enabled ? "stream" : "unary"} ·{" "}
                    {req.structuredOutput.mode}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Metrics
                  </dt>
                  <dd className="mt-1">
                    fail={req.metrics.failureClass}
                    {req.metrics.latencyMs != null
                      ? ` · ${req.metrics.latencyMs}ms`
                      : ""}
                  </dd>
                </div>
              </dl>
              {req.validationErrors.length > 0 ? (
                <p className="mt-3 text-sm text-rose-200/90">
                  Validation: {req.validationErrors.join(", ")}
                </p>
              ) : null}
              {req.rejectionReason ? (
                <p className="mt-2 text-sm text-rose-200/90">
                  Rejection: {req.rejectionReason}
                </p>
              ) : null}
              {req.failureReason ? (
                <p className="mt-2 text-sm text-amber-200/90">
                  Failure: {req.failureReason}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-white/40">
                corr {req.correlationId}
                {req.auditEntryId ? ` · audit ${req.auditEntryId}` : ""}
              </p>
            </article>
          ))
        )}
      </section>
    </PrivateAiShell>
  );
}
