import Link from "next/link";
import { redirect } from "next/navigation";
import AppTopNav from "../../../components/AppTopNav";
import {
  AI_PIPELINE_STAGES,
  aiOrchestrationStore,
  buildOrchestrationResultView,
  orchestrateAiServiceRequest,
} from "../../../../lib/ai/orchestration";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../../../lib/store/adminAuth";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import { APP_ROUTES } from "../../../lib/nav";

export const metadata = {
  title: "AI Orchestration | UMTUBA",
};

const PATH = "/admin/ai/orchestration";

export default async function AdminAiOrchestrationPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(PATH)}`);
  }
  const supabase = await createClient();
  const isAdmin = await assertPlatformAdminDb(supabase);
  if (!isAdmin) {
    redirect(
      `${APP_ROUTES.home}?error=${encodeURIComponent(ADMIN_STORE_UNAUTHORIZED)}`
    );
  }

  // Sample dry orchestration for operator visibility (no inference).
  const sample = orchestrateAiServiceRequest({
    capabilityId: "platform.translation_suggest",
    tenantId: "platform",
    userId: user.id,
    runtimeId: "shared_ai_gateway",
  });
  const view = buildOrchestrationResultView(sample);
  const recent = aiOrchestrationStore.listRecent(20);

  return (
    <main className="min-h-screen bg-[#050510] pb-16 text-white">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <AppTopNav
          title="AI Service Orchestration"
          subtitle="Pipeline Foundation V1"
        />
        <nav
          aria-label="AI admin"
          className="mt-4 flex flex-wrap gap-2 border-b border-white/10 pb-4"
        >
          <Link
            href={APP_ROUTES.adminStore}
            className="watch-focus-ring rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-bold text-white/70"
          >
            Store admin
          </Link>
          <Link
            href="/admin/ai"
            className="watch-focus-ring rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-bold text-white/70"
          >
            Diagnostics
          </Link>
          <Link
            href="/admin/ai/capabilities"
            className="watch-focus-ring rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-bold text-white/70"
          >
            Capabilities
          </Link>
          <Link
            href="/admin/ai/usage"
            className="watch-focus-ring rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-bold text-white/70"
          >
            Usage
          </Link>
          <Link
            href="/admin/ai/policies"
            className="watch-focus-ring rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-bold text-white/70"
          >
            Policies
          </Link>
          <span className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white">
            Orchestration
          </span>
        </nav>

        <section className="mt-6 space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
            <h1 className="text-2xl font-black tracking-tight">
              Service orchestration pipeline
            </h1>
            <p className="mt-2 text-sm text-white/50">
              Unified pre-execution pipeline across catalog, policy, quota,
              routing plan, and invocation plan. No live inference in this
              foundation.
            </p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                  Pipeline stages
                </dt>
                <dd className="mt-1 text-2xl font-black">
                  {AI_PIPELINE_STAGES.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                  Sample outcome
                </dt>
                <dd className="mt-1 text-2xl font-black">{view.outcome}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                  Current stage
                </dt>
                <dd className="mt-1 text-2xl font-black">
                  {view.currentStage ?? "—"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
            <h2 className="text-lg font-black">Stage order</h2>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-white/70">
              {AI_PIPELINE_STAGES.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
            <h2 className="text-lg font-black">Sample stage results</h2>
            <p className="mt-2 text-sm text-white/50">
              Stop reason: {view.stopReason ?? "none"} · Applied policies:{" "}
              {sample.appliedPolicyIds.length}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              {view.stageSummaries.map((s) => (
                <li
                  key={s.stageId}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2"
                >
                  <span className="font-semibold text-white">{s.stageId}</span>{" "}
                  · {s.status} · {s.summary}
                  {s.policyId ? ` · policy ${s.policyId}` : ""}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
            <h2 className="text-lg font-black">Recent orchestration runs</h2>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              {recent.length === 0 ? (
                <li>No runs in this process yet.</li>
              ) : (
                recent
                  .slice()
                  .reverse()
                  .map((r) => (
                    <li key={r.orchestrationId}>
                      {r.outcome} · {r.capabilityId} · stage{" "}
                      {r.currentStage ?? "—"}
                      {r.stopReason ? ` · ${r.stopReason}` : ""}
                    </li>
                  ))
              )}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
