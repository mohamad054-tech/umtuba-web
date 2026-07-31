import {
  PRIVATE_AI_LIFECYCLE_ORDER,
  getPrivateAiService,
  transitionRequiresReason,
} from "../../../../lib/privateAi";
import PrivateAiShell from "../PrivateAiShell";
import { requirePrivateAiAdmin } from "../requirePrivateAiAdmin";
import { transitionPrivateAiLifecycleAction } from "./actions";

export const metadata = { title: "Private AI Lifecycle | UMTUBA" };

export default async function PrivateAiLifecyclePage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; ok?: string }>;
}) {
  await requirePrivateAiAdmin();
  const params = (await searchParams) ?? {};
  const svc = getPrivateAiService();
  const models = svc.listModels();
  const audit = svc.listAuditTrail().slice(-25).reverse();

  return (
    <PrivateAiShell
      title="Lifecycle"
      subtitle="Private AI Workflow & Lifecycle V1"
    >
      <section className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h1 className="text-lg font-black">Admin workflow</h1>
          <p className="mt-2 text-sm text-white/50">
            Governed lifecycle only — no training, fine-tuning, or inference.
            Approve/activate require the Readiness Gate.
          </p>
          <p className="mt-3 text-xs text-white/45">
            {PRIVATE_AI_LIFECYCLE_ORDER.join(" · ")}
          </p>
          {params.ok ? (
            <p className="mt-3 text-sm text-emerald-300">Transition applied.</p>
          ) : null}
          {params.error ? (
            <p className="mt-3 text-sm text-rose-300">{params.error}</p>
          ) : null}
        </div>

        {models.map((m) => {
          const allowed = svc.listAllowedTransitions(m.id);
          const readiness = svc.evaluateReadiness(m.id);
          return (
            <div
              key={m.id}
              className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7"
            >
              <h2 className="font-black">{m.name}</h2>
              <p className="mt-1 font-mono text-[11px] text-blue-100/80">
                {m.id}
              </p>
              <p className="mt-2 text-sm text-white/55">
                State: <span className="text-white">{m.lifecycle}</span> · class{" "}
                {m.modelClass}
              </p>
              {m.reviewReason ? (
                <p className="mt-1 text-sm text-amber-200/80">
                  Review reason: {m.reviewReason}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-white/45">
                Readiness:{" "}
                {readiness.ready
                  ? "ready"
                  : `blocked (${readiness.blockers.join(", ")})`}
              </p>

              {allowed.length === 0 ? (
                <p className="mt-4 text-sm text-white/45">
                  Terminal state — no further transitions.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {allowed.map((to) => (
                    <li
                      key={to}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                    >
                      <form
                        action={transitionPrivateAiLifecycleAction}
                        className="flex flex-col gap-2 sm:flex-row sm:items-end"
                      >
                        <input type="hidden" name="modelId" value={m.id} />
                        <input type="hidden" name="to" value={to} />
                        <div className="flex-1">
                          <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
                            Transition → {to}
                            {transitionRequiresReason(to)
                              ? " (reason required)"
                              : ""}
                          </label>
                          <input
                            name="reason"
                            placeholder={
                              transitionRequiresReason(to)
                                ? "Required reason"
                                : "Optional reason"
                            }
                            className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                          />
                        </div>
                        <button
                          type="submit"
                          className="watch-focus-ring rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white"
                        >
                          Apply
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="font-black">Audit trail (latest 25)</h2>
          {audit.length === 0 ? (
            <p className="mt-2 text-sm text-white/45">No transitions yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-white/10 text-sm">
              {audit.map((entry) => (
                <li key={entry.id} className="py-2">
                  <p className="font-mono text-[11px] text-blue-100/80">
                    {entry.timestamp} · {entry.action}
                  </p>
                  <p className="mt-1 text-white/70">
                    {entry.modelId ?? "—"}: {entry.previousState ?? "∅"} →{" "}
                    {entry.newState ?? "∅"}
                    {entry.reason ? ` · ${entry.reason}` : ""}
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
