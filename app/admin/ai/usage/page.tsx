import Link from "next/link";
import { redirect } from "next/navigation";
import AppTopNav from "../../../components/AppTopNav";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../../../lib/store/adminAuth";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import { adminUsageActor } from "../../../../lib/ai/usage/usagePermissions";
import {
  aiUsageFoundationStore,
  aiUsageQuotasBillingFoundation,
} from "../../../../lib/ai/usage/usageFoundationIndex";
import { APP_ROUTES } from "../../../lib/nav";

export const metadata = {
  title: "AI Usage & Quotas | UMTUBA",
};

const PATH = "/admin/ai/usage";

export default async function AdminAiUsagePage() {
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

  const actor = adminUsageActor(user.id, "platform");
  const report = aiUsageQuotasBillingFoundation.aggregate(actor);
  const recent = aiUsageQuotasBillingFoundation.listRecentEvents(actor, 25);
  const quotaPolicies = aiUsageFoundationStore.listQuotaPolicies();
  const budgetPolicies = aiUsageFoundationStore.listBudgetPolicies();
  const costPolicies = aiUsageFoundationStore.listCostPolicies();
  const exemptions = aiUsageFoundationStore.listExemptions();
  const denials = aiUsageFoundationStore.listPreflightDenials(25);

  return (
    <main className="min-h-screen bg-[#050510] pb-16 text-white">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <AppTopNav
          title="AI Usage & Quotas"
          subtitle="Billing Foundation V1 (estimated only)"
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
          <span className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white">
            Usage
          </span>
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
          <Link
            href="/admin/ai/execution-pipeline"
            className="watch-focus-ring rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-bold text-white/70"
          >
            Execution
          </Link>
        </nav>

        <section className="mt-6 space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
            <h1 className="text-2xl font-black tracking-tight">
              Usage, quotas & estimated cost
            </h1>
            <p className="mt-2 text-sm text-white/50">
              Foundation only — no Stripe, wallet deduction, invoices, or live
              provider pricing. Safe metadata only; prompts and secrets are
              never shown.
            </p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                  Events
                </dt>
                <dd className="mt-1 text-2xl font-black">
                  {report.totals.events}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                  Est. cost (minor)
                </dt>
                <dd className="mt-1 text-2xl font-black">
                  {report.totals.estimatedCostMinor}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                  Hard denials
                </dt>
                <dd className="mt-1 text-2xl font-black">
                  {report.totals.hardLimitDenials}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                  Warnings
                </dt>
                <dd className="mt-1 text-2xl font-black">
                  {report.totals.warnings}
                </dd>
              </div>
            </dl>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="By capability" rows={report.byCapability.slice(0, 8)} />
            <Panel
              title="By provider / model / runtime"
              rows={[
                ...report.byProvider.slice(0, 3),
                ...report.byModel.slice(0, 3),
                ...report.byRuntime.slice(0, 3),
              ]}
            />
            <Panel title="Top tenants" rows={report.byTenant.slice(0, 8)} />
            <Panel title="Top users" rows={report.byUser.slice(0, 8)} />
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
            <h2 className="text-lg font-black">Recent usage events</h2>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              {recent.length === 0 ? (
                <li>No usage events recorded in this process yet.</li>
              ) : (
                recent
                  .slice()
                  .reverse()
                  .map((e) => (
                    <li
                      key={e.usageEventId}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2"
                    >
                      <span className="font-semibold text-white">
                        {e.capabilityId}
                      </span>{" "}
                      · {e.status} · units {e.totalUnits} · cost{" "}
                      {e.estimatedCostMinor ?? 0} · {e.policyVersion}
                    </li>
                  ))
              )}
            </ul>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <PolicyPanel
              title="Quota policies"
              items={quotaPolicies.map(
                (p) =>
                  `${p.policyId} · hard ${p.hardLimit ?? "n/a"} · soft ${p.softLimit ?? "n/a"} · v${p.version}`
              )}
            />
            <PolicyPanel
              title="Budget policies"
              items={budgetPolicies.map(
                (p) =>
                  `${p.policyId} · warn ${p.warningThresholdRatio} · stop ${p.hardStopThresholdRatio} · ${p.currency}`
              )}
            />
            <PolicyPanel
              title="Cost estimation (local fixtures)"
              items={costPolicies.map(
                (p) =>
                  `${p.policyId} · ${p.priceVersion} · source=${p.pricingSource}`
              )}
            />
            <PolicyPanel
              title="Exemptions"
              items={
                exemptions.length
                  ? exemptions.map(
                      (e) =>
                        `${e.exemptionId} · ${e.capabilityId ?? "*"} · ${e.enabled ? "on" : "off"}`
                    )
                  : ["None"]
              }
            />
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
            <h2 className="text-lg font-black">
              Failure classifications / denials
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              {denials.length === 0 ? (
                <li>No preflight denials or warnings yet.</li>
              ) : (
                denials
                  .slice()
                  .reverse()
                  .map((d, i) => (
                    <li key={`${d.at}-${i}`}>
                      {d.decision} · {d.capabilityId} · {d.reason}
                    </li>
                  ))
              )}
            </ul>
            <p className="mt-4 text-xs text-white/40">
              Success {report.totals.success} · Failure {report.totals.failure} ·
              Charge intents disabled / non-executable.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Panel({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    key: string;
    events: number;
    totalUnits: number;
    estimatedCostMinor: number;
  }>;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
      <h2 className="text-lg font-black">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm text-white/70">
        {rows.length === 0 ? (
          <li>No data.</li>
        ) : (
          rows.map((r) => (
            <li key={`${title}-${r.key}`}>
              {r.key} · events {r.events} · units {r.totalUnits} · cost{" "}
              {r.estimatedCostMinor}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function PolicyPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
      <h2 className="text-lg font-black">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm text-white/70">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
