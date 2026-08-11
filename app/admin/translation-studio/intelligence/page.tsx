import Link from "next/link";
import {
  getStyleProfile,
  getTranslationIntelligenceService,
  listStyleProfiles,
} from "../../../../lib/translationStudio";
import { requireTranslationStudioAdmin } from "../requireTranslationStudioAdmin";
import TranslationStudioShell, {
  TRANSLATION_STUDIO_BASE,
} from "../TranslationStudioShell";

export const metadata = {
  title: "Intelligence · Translation Studio | UMTUBA",
};

export default async function TranslationIntelligencePage() {
  await requireTranslationStudioAdmin();
  const intel = getTranslationIntelligenceService();
  const records = intel.listRecords().slice(0, 50);
  const index = intel.listIndex().slice(0, 30);
  const profiles = listStyleProfiles();

  return (
    <TranslationStudioShell
      title="Translation Intelligence"
      subtitle="Learning metadata — no model training"
    >
      <section className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="text-xl font-black">Foundation V1</h2>
          <p className="mt-2 text-sm text-white/55">
            Records provenance, rights, quality, eligibility, and corrections for
            approved translations. External/AI output stays untrusted until
            review. No training, fine-tuning, STT, TTS, or voice cloning.
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Records
              </dt>
              <dd className="mt-1 text-2xl font-black">{intel.listRecords().length}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Index entries
              </dt>
              <dd className="mt-1 text-2xl font-black">{intel.listIndex().length}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                External candidates
              </dt>
              <dd className="mt-1 text-2xl font-black">
                {intel.getState().externalCandidates.length}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="text-lg font-black">Style profiles</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {profiles.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm"
              >
                <p className="font-bold">{p.label}</p>
                <p className="mt-1 text-xs text-white/50">
                  {p.tone} · {p.formality} formality · {p.terminologyStrictness}{" "}
                  terms
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="text-lg font-black">Recent intelligence records</h2>
          {records.length === 0 ? (
            <p className="mt-3 text-sm text-white/50">
              No records yet. Approve a translation in Studio to create one.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-white/10">
              {records.map((r) => {
                const style = getStyleProfile(r.styleProfileId);
                return (
                  <li key={r.id} className="py-3">
                    <Link
                      href={`${TRANSLATION_STUDIO_BASE}/intelligence/${r.id}`}
                      className="watch-focus-ring block rounded-xl px-2 py-2 hover:bg-white/5"
                    >
                      <p className="font-mono text-xs text-blue-100">{r.id}</p>
                      <p className="mt-1 text-sm text-white/80">
                        {r.sourceText} →{" "}
                        <span dir="auto">{r.approvedTargetText}</span>
                      </p>
                      <p className="mt-2 text-[11px] text-white/45">
                        {r.targetLocale} · {r.trustLevel} · rights{" "}
                        {r.usageRights.status} · quality{" "}
                        {r.quality.overallScore.toFixed(2)} · {style.label} ·{" "}
                        {r.eligibility.join(", ")}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="text-lg font-black">Derived index</h2>
          {index.length === 0 ? (
            <p className="mt-3 text-sm text-white/50">Empty.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-xs text-white/60">
              {index.map((e) => (
                <li key={e.id} className="rounded-xl border border-white/10 px-3 py-2">
                  fp {e.sourceFingerprint.slice(0, 12)}… · reuse {e.reuseCount} ·
                  variants {e.approvedTargetVariants.length} · corrections{" "}
                  {e.reviewerCorrections}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </TranslationStudioShell>
  );
}
