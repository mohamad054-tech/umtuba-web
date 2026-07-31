import Link from "next/link";
import { redirect } from "next/navigation";
import AppTopNav from "../../components/AppTopNav";
import { loadAiPlatformDiagnostics } from "../../../lib/ai/capabilities/admin/diagnostics";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../../lib/store/adminAuth";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import { APP_ROUTES } from "../../lib/nav";

export const metadata = {
  title: "AI Platform Diagnostics | UMTUBA",
};

const ADMIN_AI_PATH = "/admin/ai";

/**
 * Isolated privileged diagnostics surface.
 * Does not modify Navigation, App Shell, shared UI kits, or global styles.
 */
export default async function AdminAiPlatformPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(ADMIN_AI_PATH)}`);
  }
  const supabase = await createClient();
  const isAdmin = await assertPlatformAdminDb(supabase);
  if (!isAdmin) {
    redirect(
      `${APP_ROUTES.home}?error=${encodeURIComponent(ADMIN_STORE_UNAUTHORIZED)}`
    );
  }

  const diagnostics = loadAiPlatformDiagnostics();

  return (
    <main className="min-h-screen bg-[#050510] pb-16 text-white">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <AppTopNav title="AI platform" subtitle="Internal diagnostics" />
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
          <span className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white">
            Diagnostics
          </span>
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
        </nav>

        <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h1 className="text-2xl font-black tracking-tight">
            AI Core Platform diagnostics
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Bounded operator view. Provider secrets, raw prompts, and private
            outputs are never shown.
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Mode", diagnostics.config.mode],
              [
                "OpenAI configured",
                diagnostics.config.openaiConfigured ? "yes" : "no",
              ],
              [
                "Stub eligible",
                diagnostics.config.stubEligible ? "yes" : "no",
              ],
              ["Available models", String(diagnostics.availableModelCount)],
              ["Completed runs", String(diagnostics.failureCounts.completed)],
              ["Failed runs", String(diagnostics.failureCounts.failed)],
              ["Blocked runs", String(diagnostics.failureCounts.blocked)],
              ["Safety blocks (24h buffer)", String(diagnostics.safetyBlocks24h)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                  {label}
                </dt>
                <dd className="mt-1 text-lg font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          {diagnostics.config.missing.length > 0 ? (
            <p className="mt-4 text-sm text-amber-100" role="status">
              Missing configuration: {diagnostics.config.missing.join(", ")}
            </p>
          ) : null}
          <p className="mt-3 text-xs text-white/40">
            {diagnostics.costAvailabilityNote} {diagnostics.retentionNote}
          </p>
        </section>

        <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
          <h2 className="text-lg font-black">Providers / models</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {diagnostics.providers.map((p) => (
              <li
                key={p.providerId}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <p className="font-semibold">
                  {p.providerId} · {p.available ? "available" : "unavailable"}
                </p>
                <p className="mt-1 text-white/50">
                  {p.models
                    .map((m) => `${m.modelId}${m.available ? "" : " (off)"}`)
                    .join(", ")}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
          <h2 className="text-lg font-black">Active prompts</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {diagnostics.prompts.map((p) => (
              <li key={`${p.promptId}@${p.version}`} className="text-white/80">
                {p.promptId}@{p.version} · {p.status} · {p.capabilityId}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
          <h2 className="text-lg font-black">Tools</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {diagnostics.tools.map((t) => (
              <li key={t.toolId} className="text-white/80">
                {t.toolId} · {t.domainOwner} ·{" "}
                {t.mutating ? "mutating" : "read-only"} ·{" "}
                {t.available ? "available" : "off"}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
          <h2 className="text-lg font-black">Usage summary (buffer)</h2>
          <p className="mt-2 text-sm text-white/70">
            Runs {diagnostics.usageSummary.runs} · in{" "}
            {diagnostics.usageSummary.inputTokens} · out{" "}
            {diagnostics.usageSummary.outputTokens} · cost available{" "}
            {diagnostics.usageSummary.costAvailableRuns} · cost unavailable{" "}
            {diagnostics.usageSummary.costUnavailableRuns}
          </p>
        </section>

        <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
          <h2 className="text-lg font-black">Recent runs</h2>
          {diagnostics.recentRuns.length === 0 ? (
            <p className="mt-3 text-sm text-white/50" role="status">
              No runs in the current process buffer.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {diagnostics.recentRuns.map((r) => (
                <li
                  key={r.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <p className="font-semibold">
                    {r.capabilityId} · {r.status}
                  </p>
                  <p className="mt-1 text-white/50">
                    {r.providerId ?? "—"}/{r.modelId ?? "—"} · {r.startedAt}
                    {r.errorCode ? ` · ${r.errorCode}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
