import Link from "next/link";
import { redirect } from "next/navigation";
import AppTopNav from "../../../components/AppTopNav";
import {
  aiUnifiedExecutionStore,
  executeUnifiedCapability,
} from "../../../../lib/ai/execution";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../../../lib/store/adminAuth";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import { APP_ROUTES } from "../../../lib/nav";

export const metadata = {
  title: "AI Execution Pipeline | UMTUBA",
};

const PATH = "/admin/ai/execution-pipeline";

export default async function AdminAiExecutionPipelinePage() {
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

  const sample = executeUnifiedCapability({
    capabilityId: "platform.translation_suggest",
    tenantId: "platform",
    userId: user.id,
    runtimeId: "shared_ai_gateway",
    surface: "admin",
    productDomain: "platform",
  });
  const recent = aiUnifiedExecutionStore.listRecent(20);

  return (
    <main className="min-h-screen bg-[#050510] pb-16 text-white">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <AppTopNav
          title="AI Execution Pipeline"
          subtitle="Unified Capability Execution V1"
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
          <Link
            href="/admin/ai/orchestration"
            className="watch-focus-ring rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-bold text-white/70"
          >
            Orchestration
          </Link>
          <span className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white">
            Execution
          </span>
        </nav>

        <section className="mt-6 space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
            <h1 className="text-2xl font-black tracking-tight">
              Unified capability execution
            </h1>
            <p className="mt-2 text-sm text-white/50">
              End-to-end pre-execution chain across catalog, policy, quota,
              orchestration, routing, adapter boundary, and invocation plan. No
              live inference.
            </p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
              <Stat label="Result" value={sample.result} />
              <Stat label="State" value={sample.state} />
              <Stat
                label="Policies"
                value={String(sample.audit.appliedPolicyIds.length)}
              />
              <Stat
                label="Duration ms"
                value={String(sample.metrics.durationMs)}
              />
            </dl>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
            <h2 className="text-lg font-black">Trace / current stages</h2>
            <p className="mt-2 text-sm text-white/50">
              Stop reason: {sample.audit.stopReason ?? "none"}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              {sample.trace.map((t, i) => (
                <li key={`${t.state}-${i}`}>
                  <span className="font-semibold text-white">{t.state}</span> —{" "}
                  {t.summary}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel
              title="Policy / Quota"
              lines={[
                `policies: ${sample.audit.appliedPolicyIds.join(", ") || "none"}`,
                `orchestration outcome: ${sample.orchestration?.outcome ?? "n/a"}`,
                `stop: ${sample.orchestration?.stopReason ?? "none"}`,
              ]}
            />
            <Panel
              title="Routing / Adapter / Invocation"
              lines={[
                `provider: ${sample.routing?.providerId ?? "n/a"}`,
                `runtime: ${sample.routing?.runtimeId ?? "n/a"}`,
                `adapter: ${sample.adapter.boundary}`,
                `invocation: ${sample.invocation.status}`,
              ]}
            />
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
            <h2 className="text-lg font-black">Orchestration stage results</h2>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              {(sample.orchestration?.stages ?? []).map((s) => (
                <li
                  key={s.stageId}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2"
                >
                  <span className="font-semibold text-white">{s.stageId}</span>{" "}
                  · {s.status} · {s.summary}
                  {s.policyId ? ` · ${s.policyId}` : ""}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
            <h2 className="text-lg font-black">Recent unified executions</h2>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              {recent.length === 0 ? (
                <li>No executions in this process yet.</li>
              ) : (
                recent
                  .slice()
                  .reverse()
                  .map((r) => (
                    <li key={r.executionId}>
                      {r.result} · {r.state} · {r.context.capabilityId}
                      {r.audit.stopReason ? ` · ${r.audit.stopReason}` : ""}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
        {label}
      </dt>
      <dd className="mt-1 text-lg font-black break-all">{value}</dd>
    </div>
  );
}

function Panel({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
      <h2 className="text-lg font-black">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm text-white/70">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </div>
  );
}
