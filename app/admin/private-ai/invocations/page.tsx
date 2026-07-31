import { getPrivateAiService } from "../../../../lib/privateAi";
import PrivateAiShell from "../PrivateAiShell";
import { requirePrivateAiAdmin } from "../requirePrivateAiAdmin";
import {
  adminMarkInvocationTimedOut,
  adminRequestInvocationCancel,
  adminScheduleInvocationRetry,
} from "./actions";

export const metadata = { title: "Invocations | UMTUBA" };

export default async function PrivateAiInvocationsPage() {
  await requirePrivateAiAdmin();
  const svc = getPrivateAiService();
  const invocations = svc
    .listInvocations()
    .slice()
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 50);
  const audit = svc
    .listAuditTrail()
    .filter((e) => String(e.action).startsWith("invocation_") || String(e.action).includes("adapter_invocation") || String(e.action).includes("retry_scheduled") || String(e.action).includes("cancellation_") || String(e.action).includes("duplicate_invocation"))
    .slice()
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .slice(0, 40);

  return (
    <PrivateAiShell
      title="Invocations"
      subtitle="Inference Invocation Orchestration V1"
    >
      <section className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h1 className="text-lg font-black">Invocation orchestration</h1>
          <p className="mt-2 text-sm text-white/50">
            Attempt lifecycle, timeout/cancellation/retry metadata, and
            normalized outcomes — no Gemini, OpenAI, local LLM, or network
            invoke. Production adapters remain non-executable.
          </p>
          <p className="mt-3 text-xs text-white/45">
            Stored invocations: {invocations.length}
          </p>
        </div>

        {invocations.length === 0 ? (
          <p className="text-sm text-white/45">No invocations yet.</p>
        ) : (
          invocations.map((inv) => (
            <article
              key={inv.invocationId}
              className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7"
            >
              <h2 className="font-mono text-sm font-black">
                {inv.invocationId}
              </h2>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Request / plan
                  </dt>
                  <dd className="mt-1 font-mono text-xs">
                    {inv.requestId} · {inv.executionPlanId}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Adapter / provider / runtime
                  </dt>
                  <dd className="mt-1 text-xs">
                    {inv.adapterId ?? "—"} · {inv.providerId ?? "—"} ·{" "}
                    {inv.runtimeId ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Lifecycle
                  </dt>
                  <dd className="mt-1">{inv.lifecycle}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Attempts
                  </dt>
                  <dd className="mt-1">
                    {inv.attemptNumber}/{inv.maxAttempts}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Timeout
                  </dt>
                  <dd className="mt-1 text-xs">
                    {inv.timeout.classification} · timedOut=
                    {String(inv.timeout.timedOut)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Cancellation
                  </dt>
                  <dd className="mt-1 text-xs">
                    requested={String(inv.cancellation.requested)} · accepted=
                    {String(inv.cancellation.accepted)} ·{" "}
                    {inv.cancellation.reason ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Retry
                  </dt>
                  <dd className="mt-1 text-xs">
                    eligible={String(inv.retry.eligible)} · scheduled=
                    {String(inv.retry.scheduled)} · {inv.retry.reason ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Normalized result
                  </dt>
                  <dd className="mt-1 text-xs text-white/70">
                    {inv.normalizedResult
                      ? `${inv.normalizedResult.outputStatus} · ${inv.normalizedResult.finishReason ?? "—"} · failure=${inv.normalizedResult.failureClass ?? "none"}`
                      : "—"}
                  </dd>
                </div>
              </dl>
              {inv.normalizedResult?.adminDiagnostic ? (
                <p className="mt-3 text-xs text-white/40">
                  Diagnostics: {inv.normalizedResult.adminDiagnostic}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {!["succeeded", "cancelled", "exhausted", "blocked"].includes(
                  inv.lifecycle
                ) ? (
                  <>
                    <form action={adminRequestInvocationCancel}>
                      <input
                        type="hidden"
                        name="invocationId"
                        value={inv.invocationId}
                      />
                      <input
                        type="hidden"
                        name="reason"
                        value="admin_cancel"
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold"
                      >
                        Request cancel
                      </button>
                    </form>
                    <form action={adminMarkInvocationTimedOut}>
                      <input
                        type="hidden"
                        name="invocationId"
                        value={inv.invocationId}
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold"
                      >
                        Mark timed out
                      </button>
                    </form>
                  </>
                ) : null}
                {(inv.lifecycle === "failed" ||
                  inv.lifecycle === "timed_out" ||
                  inv.lifecycle === "retry_scheduled") &&
                inv.retry.eligible ? (
                  <form action={adminScheduleInvocationRetry}>
                    <input
                      type="hidden"
                      name="invocationId"
                      value={inv.invocationId}
                    />
                    <button
                      type="submit"
                      className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold"
                    >
                      Schedule retry metadata
                    </button>
                  </form>
                ) : null}
              </div>
            </article>
          ))
        )}

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="text-base font-black">Recent invocation audit</h2>
          {audit.length === 0 ? (
            <p className="mt-2 text-sm text-white/45">No events yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {audit.map((e) => (
                <li
                  key={e.id}
                  className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs"
                >
                  <span className="font-mono">{e.action}</span>
                  <span className="text-white/40"> · {e.timestamp}</span>
                  <p className="mt-1 text-white/60">
                    {e.reason ?? "—"} ·{" "}
                    {String(
                      (e.detail as { invocationId?: string })?.invocationId ??
                        ""
                    )}
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
