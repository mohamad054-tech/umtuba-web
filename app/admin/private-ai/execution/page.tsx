import { getPrivateAiService } from "../../../../lib/privateAi";
import PrivateAiShell from "../PrivateAiShell";
import { requirePrivateAiAdmin } from "../requirePrivateAiAdmin";

export const metadata = { title: "Private AI Execution Boundary | UMTUBA" };

export default async function PrivateAiExecutionBoundaryPage() {
  await requirePrivateAiAdmin();
  const svc = getPrivateAiService();
  const plans = svc
    .listExecutionPlans()
    .slice()
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 50);
  const policy = svc.getExecutionPolicy();
  const quota = svc.getExecutionQuota();

  return (
    <PrivateAiShell
      title="Execution"
      subtitle="Inference Execution Boundary V1"
    >
      <section className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h1 className="text-lg font-black">Execution boundary</h1>
          <p className="mt-2 text-sm text-white/50">
            Plans and guards only — no provider calls, model loads, or
            inference.
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                Policy
              </dt>
              <dd className="mt-1 text-xs text-white/70">
                ready={String(policy.requireReadyRuntime)} · lifecycle=
                {String(policy.requireApprovedModelLifecycle)} · maxTimeout=
                {policy.maxTimeoutMs}ms
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                Quota state
              </dt>
              <dd className="mt-1 text-xs text-white/70">
                req {quota.requestsUsed}/{quota.requestQuota} · day{" "}
                {quota.dailyUsed}/{quota.dailyQuota} · tenant {quota.tenantUsed}/
                {quota.tenantQuota}
              </dd>
            </div>
          </dl>
        </div>

        {plans.length === 0 ? (
          <p className="text-sm text-white/45">No execution plans yet.</p>
        ) : (
          plans.map((plan) => (
            <article
              key={plan.planId}
              className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7"
            >
              <h2 className="font-mono text-sm font-black">{plan.planId}</h2>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Status
                  </dt>
                  <dd className="mt-1">{plan.status}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Request
                  </dt>
                  <dd className="mt-1 font-mono text-xs">{plan.requestId}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Selected runtime
                  </dt>
                  <dd className="mt-1">{plan.selectedRuntimeId ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Budget
                  </dt>
                  <dd className="mt-1 text-xs">
                    {plan.context
                      ? `units=${plan.context.budget.executionBudgetUnits} tokens=${plan.context.budget.estimatedTokens ?? "—"}/${plan.context.budget.tokenBudget ?? "—"}`
                      : "—"}
                  </dd>
                </div>
              </dl>
              {plan.guardErrors.length > 0 ? (
                <p className="mt-3 text-sm text-rose-200/90">
                  Blocked: {plan.guardErrors.join(", ")}
                </p>
              ) : null}
              {plan.error ? (
                <p className="mt-2 text-sm text-amber-200/90">
                  {plan.error.class}: {plan.error.message}
                </p>
              ) : null}
              {plan.context ? (
                <p className="mt-2 text-xs text-white/40">
                  provider {plan.context.providerId} · model{" "}
                  {plan.context.modelId} · timeout{" "}
                  {plan.context.timeout.timeoutMs}ms · cancel{" "}
                  {plan.context.cancellation.cancellationTokenId}
                </p>
              ) : null}
            </article>
          ))
        )}
      </section>
    </PrivateAiShell>
  );
}
