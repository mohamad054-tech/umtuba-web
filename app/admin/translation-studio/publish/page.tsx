import Link from "next/link";
import {
  buildAppShellPublishBatch,
  buildLearningPublishBatch,
  buildPublishContract,
  getTranslationStudio,
} from "../../../../lib/translationStudio";
import { requireTranslationStudioAdmin } from "../requireTranslationStudioAdmin";
import TranslationStatusBadge from "../TranslationStatusBadge";
import TranslationStudioShell, {
  TRANSLATION_STUDIO_BASE,
} from "../TranslationStudioShell";

export const metadata = {
  title: "Publish queue · Translation Studio | UMTUBA",
};

export default async function TranslationStudioPublishPage() {
  await requireTranslationStudioAdmin();
  const studio = getTranslationStudio();
  const snap = studio.getSnapshot();
  const contract = buildPublishContract(snap);
  const batch = buildAppShellPublishBatch(snap);
  const learningBatch = buildLearningPublishBatch(snap);
  const queue = studio.workflow.listPublishEligible();
  const keyById = new Map(snap.keys.map((k) => [k.id, k]));

  return (
    <TranslationStudioShell
      title="Publish queue"
      subtitle="Contract only — auto-publish disabled"
    >
      <section className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h1 className="text-xl font-black">Learning publish batch</h1>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Format
              </dt>
              <dd className="mt-1 font-mono text-xs text-white/80">
                {learningBatch.format}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Dry-run / writes
              </dt>
              <dd className="mt-1 text-amber-100">
                {String(learningBatch.dryRun)} /{" "}
                {String(learningBatch.writesCatalogFiles)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Records / keys
              </dt>
              <dd className="mt-1 text-white/70">
                {learningBatch.preview.recordCount} /{" "}
                {learningBatch.preview.keyCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Domain
              </dt>
              <dd className="mt-1 text-white/70">{learningBatch.domain}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h1 className="text-xl font-black">App Shell publish batch</h1>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Format
              </dt>
              <dd className="mt-1 font-mono text-xs text-white/80">
                {batch.format}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Dry-run
              </dt>
              <dd className="mt-1 text-amber-100">{String(batch.dryRun)}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Writes catalog files
              </dt>
              <dd className="mt-1 text-amber-100">
                {String(batch.writesCatalogFiles)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Records / keys
              </dt>
              <dd className="mt-1 text-white/70">
                {batch.preview.recordCount} / {batch.preview.keyCount}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-white/50">
            Preview only. No production publish and no catalog file write in
            this milestone.
          </p>
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-bold text-white/70">
              Changed keys ({batch.changedKeys.length})
            </summary>
            <ul className="mt-2 max-h-48 overflow-auto font-mono text-[11px] text-white/55">
              {batch.changedKeys.map((key) => (
                <li key={key}>{key}</li>
              ))}
            </ul>
          </details>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="text-lg font-black">Legacy publish contract</h2>
          <p className="mt-2 text-xs text-white/50">
            {contract.format} · records {contract.records.length} · autoPublish=
            {String(contract.autoPublish)}
          </p>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="text-lg font-black">
            Eligible values · {queue.length}
          </h2>
          {queue.length === 0 ? (
            <p className="mt-4 text-sm text-white/50">
              No approved / ready-for-publish values.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-white/10">
              {queue.slice(0, 80).map((value) => {
                const key = keyById.get(value.keyId);
                return (
                  <li
                    key={value.id}
                    className="flex flex-wrap items-start justify-between gap-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`${TRANSLATION_STUDIO_BASE}/keys/${value.keyId}`}
                        className="watch-focus-ring font-mono text-sm font-bold text-blue-100"
                      >
                        {key?.key ?? value.keyId}
                      </Link>
                      <p className="mt-1 text-xs text-white/45">
                        {value.language.toUpperCase()} · v{value.version}
                      </p>
                      <p className="mt-2 text-sm text-white/70" dir="auto">
                        {value.value}
                      </p>
                    </div>
                    <TranslationStatusBadge status={value.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </TranslationStudioShell>
  );
}
