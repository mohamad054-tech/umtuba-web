import Link from "next/link";
import {
  APP_SHELL_NAMESPACES,
  buildAppShellPublishBatch,
  getTranslationStudio,
  summarizeFindings,
  validateAppShellTerminology,
} from "../../../lib/translationStudio";
import { requireTranslationStudioAdmin } from "./requireTranslationStudioAdmin";
import { scheduleTranslationStudioDualReadObservation } from "./scheduleDualReadObservation";
import TranslationStudioShell, {
  TRANSLATION_STUDIO_BASE,
} from "./TranslationStudioShell";

export const metadata = {
  title: "Translation Studio | UMTUBA",
};

export default async function TranslationStudioOverviewPage() {
  const { supabase } = await requireTranslationStudioAdmin();
  scheduleTranslationStudioDualReadObservation({
    supabase,
    surface: "landing",
  });
  const studio = getTranslationStudio();
  const snap = studio.getSnapshot();
  const findingsLive = validateAppShellTerminology({
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    ...snap,
  });
  const summary = summarizeFindings(findingsLive);
  const batch = buildAppShellPublishBatch(snap);

  const statusTotals = {
    approved: 0,
    needs_review: 0,
    missing: 0,
    draft: 0,
    other: 0,
  };
  for (const value of snap.values) {
    if (value.status === "approved" || value.status === "ready_for_publish") {
      statusTotals.approved += 1;
    } else if (value.status === "needs_review") {
      statusTotals.needs_review += 1;
    } else if (value.status === "missing") {
      statusTotals.missing += 1;
    } else if (value.status === "draft") {
      statusTotals.draft += 1;
    } else {
      statusTotals.other += 1;
    }
  }

  const cards = [
    {
      label: "App Shell keys",
      value: String(snap.keys.length),
      href: `${TRANSLATION_STUDIO_BASE}/keys?namespace=nav`,
    },
    {
      label: "Approved / ready",
      value: String(statusTotals.approved),
      href: `${TRANSLATION_STUDIO_BASE}/publish`,
    },
    {
      label: "Needs review",
      value: String(statusTotals.needs_review),
      href: `${TRANSLATION_STUDIO_BASE}/review`,
    },
    {
      label: "Missing",
      value: String(statusTotals.missing),
      href: `${TRANSLATION_STUDIO_BASE}/keys`,
    },
    {
      label: "Memory (AR)",
      value: String(snap.memory.filter((m) => m.language === "ar").length),
      href: `${TRANSLATION_STUDIO_BASE}/keys`,
    },
    {
      label: "Term warnings",
      value: String(summary.conflictCount + summary.leakageCount),
      href: `${TRANSLATION_STUDIO_BASE}/app-shell`,
    },
  ];

  return (
    <TranslationStudioShell title="Translation Studio">
      <section className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="text-2xl font-black tracking-tight">
            App Shell catalog review
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-white/55">
            First real platform batch: ingested App Shell namespaces (
            {APP_SHELL_NAMESPACES.join(", ")}). English approved as source;
            Arabic approved when valid; FR/ES/DE/PT fallbacks stay Needs Review.
            Publish remains dry-run only.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className="watch-focus-ring rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:bg-white/5"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-black">{card.value}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="text-lg font-black">Namespaces</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {APP_SHELL_NAMESPACES.map((ns) => (
              <Link
                key={ns}
                href={`${TRANSLATION_STUDIO_BASE}/keys?namespace=${ns}`}
                className="watch-focus-ring rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold"
              >
                {ns}
              </Link>
            ))}
          </div>
          <p className="mt-4 text-xs text-white/45">
            Publish batch preview: {batch.preview.recordCount} approved records
            · {batch.preview.keyCount} keys · dryRun=
            {String(batch.dryRun)} · writesCatalogFiles=
            {String(batch.writesCatalogFiles)}
          </p>
        </div>
      </section>
    </TranslationStudioShell>
  );
}
