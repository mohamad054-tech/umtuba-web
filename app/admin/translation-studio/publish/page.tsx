import Link from "next/link";
import {
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
  const queue = studio.workflow.listPublishEligible();
  const keyById = new Map(snap.keys.map((k) => [k.id, k]));

  return (
    <TranslationStudioShell
      title="Publish queue"
      subtitle="Contract only — auto-publish disabled"
    >
      <section className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h1 className="text-xl font-black">Publish contract</h1>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Format
              </dt>
              <dd className="mt-1 font-mono text-xs text-white/80">
                {contract.format}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Auto-publish
              </dt>
              <dd className="mt-1 text-amber-100">
                {String(contract.autoPublish)} (hard off)
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Eligibility
              </dt>
              <dd className="mt-1 text-white/70">{contract.eligibility}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Records
              </dt>
              <dd className="mt-1 text-white/70">{contract.records.length}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-white/50">
            Future publisher may read this contract. This UI does not write
            product i18n catalogs.
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
          {queue.length > 80 ? (
            <p className="mt-3 text-xs text-white/40">
              Showing first 80 of {queue.length}.
            </p>
          ) : null}
        </div>
      </section>
    </TranslationStudioShell>
  );
}
