import Link from "next/link";
import { redirect } from "next/navigation";
import AppTopNav from "../../../components/AppTopNav";
import {
  CREATOR_DESCRIPTION_CONTRACT,
  CREATOR_HASHTAG_CONTRACT,
  CREATOR_MODERATION_CONTRACT,
  CREATOR_REWRITE_CONTRACT,
  CREATOR_SEO_CONTRACT,
  CREATOR_STUDIO_CAPABILITY_ID,
  CREATOR_SUGGESTION_CONTRACT,
  CREATOR_TITLE_CONTRACT,
  CREATOR_TRANSLATION_CONTRACT,
  creatorStudioTemplateRegistry,
} from "../../../../lib/ai/creatorStudio";
import { getCapabilityCatalogRegistry } from "../../../../lib/ai/catalog";
import { aiPolicyRegistry } from "../../../../lib/ai/policy";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../../../lib/store/adminAuth";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import { APP_ROUTES } from "../../../lib/nav";

export const metadata = {
  title: "AI Creator Studio | UMTUBA Admin",
};

const PATH = "/admin/ai/creator-studio";

export default async function AdminAiCreatorStudioPage() {
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

  const templates = creatorStudioTemplateRegistry.list();
  const capability = getCapabilityCatalogRegistry().lookup(
    CREATOR_STUDIO_CAPABILITY_ID
  );
  const binding = aiPolicyRegistry.get(
    `binding.${CREATOR_STUDIO_CAPABILITY_ID}.v1`
  );
  const contracts = [
    CREATOR_SUGGESTION_CONTRACT,
    CREATOR_REWRITE_CONTRACT,
    CREATOR_TITLE_CONTRACT,
    CREATOR_DESCRIPTION_CONTRACT,
    CREATOR_HASHTAG_CONTRACT,
    CREATOR_SEO_CONTRACT,
    CREATOR_TRANSLATION_CONTRACT,
    CREATOR_MODERATION_CONTRACT,
  ];

  return (
    <main className="min-h-screen bg-[#050510] pb-16 text-white">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <AppTopNav
          title="AI Creator Studio"
          subtitle="Foundation contracts (no live inference)"
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
          <Link
            href="/admin/ai/execution-pipeline"
            className="watch-focus-ring rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-bold text-white/70"
          >
            Execution
          </Link>
          <span className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white">
            Creator Studio
          </span>
        </nav>

        <section className="mt-6 space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
            <h1 className="text-2xl font-black tracking-tight">
              Creator Studio Foundation
            </h1>
            <p className="mt-2 text-sm text-white/50">
              Templates, capability mapping, prompt contracts, and policy
              bindings. Requests enter only via Unified Capability Execution.
            </p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <Stat label="Templates" value={String(templates.length)} />
              <Stat
                label="Capability"
                value={capability?.capabilityId ?? "missing"}
              />
              <Stat
                label="Policy binding"
                value={binding?.policyId ?? "missing"}
              />
            </dl>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
            <h2 className="text-lg font-black">Capability</h2>
            {capability ? (
              <dl className="mt-3 grid gap-2 text-sm text-white/70 sm:grid-cols-2">
                <div>
                  <dt className="text-white/40">ID</dt>
                  <dd>{capability.capabilityId}</dd>
                </div>
                <div>
                  <dt className="text-white/40">Lifecycle</dt>
                  <dd>{capability.lifecycle}</dd>
                </div>
                <div>
                  <dt className="text-white/40">Category</dt>
                  <dd>{capability.category}</dd>
                </div>
                <div>
                  <dt className="text-white/40">Structured output</dt>
                  <dd>
                    {capability.structuredOutputSupport ? "yes" : "no"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-white/40">Summary</dt>
                  <dd>{capability.documentation.summary}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-rose-300">
                Capability not registered.
              </p>
            )}
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
            <h2 className="text-lg font-black">Templates</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {templates.map((t) => (
                <li
                  key={t.templateId}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <p className="font-bold text-white">
                    {t.displayName}{" "}
                    <span className="font-normal text-white/40">
                      ({t.templateId})
                    </span>
                  </p>
                  <p className="mt-1 text-white/55">{t.description}</p>
                  <p className="mt-2 text-xs text-white/40">
                    Outputs: {t.supportedOutputKinds.join(", ")}
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    Policy: {t.policyBindingHint}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
            <h2 className="text-lg font-black">Prompt contracts</h2>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              {contracts.map((c) => (
                <li key={c.contractId}>
                  <code className="text-cyan-200/80">{c.contractId}</code>
                  <pre className="mt-1 overflow-auto rounded-xl bg-black/40 p-2 text-xs text-white/45">
                    {JSON.stringify(c, null, 2)}
                  </pre>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
            <h2 className="text-lg font-black">Related policies</h2>
            {binding ? (
              <pre className="mt-3 overflow-auto rounded-xl bg-black/40 p-3 text-xs text-white/55">
                {JSON.stringify(binding, null, 2)}
              </pre>
            ) : (
              <p className="mt-3 text-sm text-rose-300">No binding found.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-white/40">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-white/90">{value}</dd>
    </div>
  );
}
