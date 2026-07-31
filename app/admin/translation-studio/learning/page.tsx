import Link from "next/link";
import {
  LEARNING_AREA_NAMESPACES,
  buildLearningPublishBatch,
  getTranslationStudio,
  validateLearningCatalogQuality,
} from "../../../../lib/translationStudio";
import { requireTranslationStudioAdmin } from "../requireTranslationStudioAdmin";
import TranslationStudioShell, {
  TRANSLATION_STUDIO_BASE,
} from "../TranslationStudioShell";

export const metadata = {
  title: "Learning · Translation Studio | UMTUBA",
};

export default async function TranslationStudioLearningPage() {
  await requireTranslationStudioAdmin();
  const studio = getTranslationStudio();
  const snap = studio.getSnapshot();
  const learningKeys = snap.keys.filter((k) => k.key.startsWith("learning."));
  const learningKeyIds = new Set(learningKeys.map((k) => k.id));
  const learningValues = snap.values.filter((v) =>
    learningKeyIds.has(v.keyId)
  );

  const counts = {
    approved: 0,
    needs_review: 0,
    missing: 0,
  };
  for (const v of learningValues) {
    if (v.status === "approved" || v.status === "ready_for_publish") {
      counts.approved += 1;
    } else if (v.status === "needs_review") counts.needs_review += 1;
    else if (v.status === "missing") counts.missing += 1;
  }

  const findings = validateLearningCatalogQuality({
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    ...snap,
  });
  const batch = buildLearningPublishBatch(snap);

  const byNamespace = LEARNING_AREA_NAMESPACES.map((ns) => ({
    ns,
    count: learningKeys.filter((k) => k.key.startsWith(`${ns}.`)).length,
  }));

  return (
    <TranslationStudioShell
      title="Learning translation"
      subtitle="Platform UI only — no course content"
    >
      <section className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h1 className="text-xl font-black">Learning overview</h1>
          <p className="mt-2 text-sm text-white/55">
            Ingested Learning platform chrome into Translation Studio. Course
            lesson bodies, video, audio, subtitles, and dubbing remain out of
            scope.
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Keys
              </dt>
              <dd className="mt-1 text-2xl font-black">{learningKeys.length}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Approved
              </dt>
              <dd className="mt-1 text-2xl font-black">{counts.approved}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Needs review
              </dt>
              <dd className="mt-1 text-2xl font-black">{counts.needs_review}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Missing
              </dt>
              <dd className="mt-1 text-2xl font-black">{counts.missing}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="text-lg font-black">Namespaces</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {byNamespace.map(({ ns, count }) => (
              <Link
                key={ns}
                href={`${TRANSLATION_STUDIO_BASE}/keys?namespace=${encodeURIComponent(ns)}`}
                className="watch-focus-ring rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold"
              >
                {ns} · {count}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`${TRANSLATION_STUDIO_BASE}/keys?namespace=learning.shared&status=needs_review`}
              className="watch-focus-ring rounded-full border border-amber-400/30 px-3 py-1.5 text-xs font-bold text-amber-100"
            >
              Needs review
            </Link>
            <Link
              href={`${TRANSLATION_STUDIO_BASE}/keys?namespace=learning.shared&status=approved`}
              className="watch-focus-ring rounded-full border border-emerald-400/30 px-3 py-1.5 text-xs font-bold text-emerald-100"
            >
              Approved
            </Link>
            <Link
              href={`${TRANSLATION_STUDIO_BASE}/publish`}
              className="watch-focus-ring rounded-full border border-violet-400/30 px-3 py-1.5 text-xs font-bold text-violet-100"
            >
              Publish preview
            </Link>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="text-lg font-black">Quality findings</h2>
          <ul className="mt-3 grid gap-2 text-sm text-white/70 sm:grid-cols-2">
            <li>Duplicate labels: {findings.duplicateLabels.length}</li>
            <li>
              Terminology conflicts: {findings.terminologyConflicts.length}
            </li>
            <li>English leakage: {findings.englishLeakage.length}</li>
            <li>Placeholder issues: {findings.placeholderIssues.length}</li>
            <li>Missing translations: {findings.missingTranslations.length}</li>
            <li>
              Needs-review (non-EN): {findings.staleTranslations.length}
            </li>
          </ul>
          <p className="mt-3 text-xs text-white/45">
            Warnings only — never auto-correct.
          </p>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="text-lg font-black">Learning publish batch</h2>
          <p className="mt-2 text-sm text-white/60">
            {batch.format} · dryRun={String(batch.dryRun)} ·
            writesCatalogFiles={String(batch.writesCatalogFiles)} · records{" "}
            {batch.preview.recordCount} · keys {batch.preview.keyCount}
          </p>
        </div>
      </section>
    </TranslationStudioShell>
  );
}
