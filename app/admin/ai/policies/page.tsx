import Link from "next/link";
import { redirect } from "next/navigation";
import AppTopNav from "../../../components/AppTopNav";
import {
  aiGovernanceRegistry,
  aiPolicyEvaluationEngine,
  aiPolicyRegistry,
} from "../../../../lib/ai/policy";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../../../lib/store/adminAuth";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import { APP_ROUTES } from "../../../lib/nav";

export const metadata = {
  title: "AI Policies & Governance | UMTUBA",
};

const PATH = "/admin/ai/policies";

export default async function AdminAiPoliciesPage() {
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

  const policies = aiPolicyRegistry.list();
  const governance = aiGovernanceRegistry.list();
  const bindings = aiPolicyRegistry.list("capability_binding");
  const recent = aiPolicyRegistry.listEvaluationLog(20);
  const sample = aiPolicyEvaluationEngine.evaluate({
    capabilityId: "platform.translation_suggest",
    tenantId: "platform",
    userId: user.id,
    runtimeId: "shared_ai_gateway",
  });

  const byKind = policies.reduce<Record<string, number>>((acc, p) => {
    acc[p.kind] = (acc[p.kind] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-[#050510] pb-16 text-white">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <AppTopNav
          title="AI Policies & Governance"
          subtitle="Policy Foundation V1"
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
          <span className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white">
            Policies
          </span>
        </nav>

        <section className="mt-6 space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
            <h1 className="text-2xl font-black tracking-tight">
              Policy & governance registry
            </h1>
            <p className="mt-2 text-sm text-white/50">
              Central policy metadata and evaluation — no inference, no secrets,
              no prompts or outputs.
            </p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
              <Stat label="Policies" value={policies.length} />
              <Stat label="Bindings" value={bindings.length} />
              <Stat label="Governance" value={governance.length} />
              <Stat label="Kinds" value={Object.keys(byKind).length} />
            </dl>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
            <h2 className="text-lg font-black">Sample evaluation</h2>
            <p className="mt-2 text-sm text-white/70">
              capability=platform.translation_suggest · decision=
              <span className="font-semibold text-white">
                {sample.decision}
              </span>{" "}
              · version={sample.effectivePolicyVersion}
            </p>
            <ul className="mt-3 space-y-1 text-sm text-white/60">
              {sample.violations.length === 0 ? (
                <li>No violations.</li>
              ) : (
                sample.violations.map((v, i) => (
                  <li key={`${v.code}-${i}`}>
                    {v.severity}: {v.code} — {v.message}
                  </li>
                ))
              )}
            </ul>
            {sample.warnings.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm text-amber-200/80">
                {sample.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
              <h2 className="text-lg font-black">Policies by kind</h2>
              <ul className="mt-3 space-y-2 text-sm text-white/70">
                {Object.entries(byKind).map(([kind, count]) => (
                  <li key={kind}>
                    {kind}: {count}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
              <h2 className="text-lg font-black">Governance records</h2>
              <ul className="mt-3 space-y-2 text-sm text-white/70">
                {governance.map((g) => (
                  <li key={g.policyId}>
                    {g.policyId} · v{g.version} · owner {g.owner} · related{" "}
                    {g.relatedPolicyIds.length}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
            <h2 className="text-lg font-black">Capability bindings</h2>
            <ul className="mt-3 max-h-80 space-y-2 overflow-auto text-sm text-white/70">
              {bindings.map((b) =>
                b.kind === "capability_binding" ? (
                  <li
                    key={b.policyId}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2"
                  >
                    <span className="font-semibold text-white">
                      {b.capabilityId}
                    </span>{" "}
                    · {b.policyId} · tenant {b.tenantPolicyId} · safety{" "}
                    {b.safetyPolicyId}
                  </li>
                ) : null
              )}
            </ul>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
            <h2 className="text-lg font-black">All policies (versions)</h2>
            <ul className="mt-3 max-h-96 space-y-2 overflow-auto text-sm text-white/70">
              {policies.map((p) => (
                <li key={p.policyId}>
                  {p.kind} · {p.policyId} · {p.lifecycle} · v{p.version}
                  {p.supersedesPolicyId
                    ? ` · supersedes ${p.supersedesPolicyId}`
                    : ""}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
            <h2 className="text-lg font-black">Recent evaluation decisions</h2>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              {recent.length === 0 ? (
                <li>No evaluations logged in this process yet.</li>
              ) : (
                recent
                  .slice()
                  .reverse()
                  .map((e, i) => (
                    <li key={`${e.at}-${i}`}>
                      {e.decision} · {e.capabilityId} · tenant {e.tenantId}
                      {e.violationCodes.length
                        ? ` · ${e.violationCodes.join(",")}`
                        : ""}
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-black">{value}</dd>
    </div>
  );
}
