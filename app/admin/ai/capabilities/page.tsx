import Link from "next/link";
import { redirect } from "next/navigation";
import AppTopNav from "../../../components/AppTopNav";
import { getCapabilityCatalogRegistry } from "../../../../lib/ai/catalog";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../../../lib/store/adminAuth";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import { APP_ROUTES } from "../../../lib/nav";

export const metadata = {
  title: "AI Capability Catalog | UMTUBA",
};

const PATH = "/admin/ai/capabilities";

export default async function AdminAiCapabilityCatalogPage() {
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

  const registry = getCapabilityCatalogRegistry();
  const capabilities = registry.list();
  const byCategory = capabilities.reduce<Record<string, number>>((acc, c) => {
    acc[c.category] = (acc[c.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-[#050510] pb-16 text-white">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <AppTopNav
          title="AI Capability Catalog"
          subtitle="Service Registry V1"
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
          <span className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white">
            Capabilities
          </span>
          <Link
            href="/admin/private-ai"
            className="watch-focus-ring rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-bold text-white/70"
          >
            Private AI
          </Link>
        </nav>

        <section className="mt-6 space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
            <h1 className="text-2xl font-black tracking-tight">
              Capability catalog & service registry
            </h1>
            <p className="mt-2 text-sm text-white/50">
              Central registry of real platform capabilities. Catalog and policy
              metadata only — no inference, no provider calls, no secrets.
            </p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                  Total
                </dt>
                <dd className="mt-1 text-2xl font-black">
                  {capabilities.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                  Executable
                </dt>
                <dd className="mt-1 text-2xl font-black">
                  {capabilities.filter((c) => c.executable).length}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                  Categories
                </dt>
                <dd className="mt-1 text-xs text-white/70">
                  {Object.entries(byCategory)
                    .map(([k, v]) => `${k}:${v}`)
                    .join(" · ")}
                </dd>
              </div>
            </dl>
          </div>

          {capabilities.map((c) => (
            <article
              key={c.capabilityId}
              className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7"
            >
              <h2 className="font-mono text-sm font-black">{c.capabilityId}</h2>
              <p className="mt-1 text-sm font-semibold">{c.displayName}</p>
              <p className="mt-2 text-sm text-white/50">{c.description}</p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Category / owner
                  </dt>
                  <dd className="mt-1 text-xs">
                    {c.category} · {c.owner}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Version / lifecycle / stability
                  </dt>
                  <dd className="mt-1 text-xs">
                    {c.version} · {c.lifecycle} · {c.stability}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Surface / executable
                  </dt>
                  <dd className="mt-1 text-xs">
                    {c.executionSurface} · executable={String(c.executable)} ·
                    visibility={c.visibility}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Deprecated
                  </dt>
                  <dd className="mt-1 text-xs">
                    {c.deprecated
                      ? `${c.deprecatedReason ?? "yes"} → ${c.replacementCapabilityId ?? "—"}`
                      : "no"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Providers / runtimes
                  </dt>
                  <dd className="mt-1 text-xs text-white/70">
                    {c.supportedProviders.join(", ") || "—"}
                    <br />
                    {c.supportedRuntimes.join(", ") || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Permissions
                  </dt>
                  <dd className="mt-1 text-xs text-white/70">
                    {c.requiredPermissions.join(", ") || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Execution policy
                  </dt>
                  <dd className="mt-1 text-xs text-white/70">
                    timeout={c.timeoutPolicy.defaultTimeoutMs}ms · retries=
                    {c.retryPolicy.maxAttempts} · stream=
                    {String(c.streamingSupport)} · structured=
                    {String(c.structuredOutputSupport)} · audit=
                    {String(c.auditPolicy.required)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-white/40">
                    Source
                  </dt>
                  <dd className="mt-1 font-mono text-[11px] text-white/45">
                    {c.documentation.sourceModule}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
