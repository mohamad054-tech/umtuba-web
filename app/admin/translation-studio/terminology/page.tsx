import { getTranslationStudio } from "../../../../lib/translationStudio";
import { requireTranslationStudioAdmin } from "../requireTranslationStudioAdmin";
import TranslationStudioShell from "../TranslationStudioShell";

export const metadata = {
  title: "Terminology · Translation Studio | UMTUBA",
};

export default async function TranslationStudioTerminologyPage() {
  await requireTranslationStudioAdmin();
  const terms = getTranslationStudio().listTerminology();

  return (
    <TranslationStudioShell title="Terminology" subtitle="Approved terms">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h1 className="text-xl font-black">Terminology database</h1>
        <ul className="mt-4 space-y-4">
          {terms.map((term) => (
            <li
              key={term.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-lg font-black">{term.term}</p>
                <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/60">
                  {term.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-white/65">{term.definition}</p>
              {term.notes ? (
                <p className="mt-1 text-xs text-white/40">{term.notes}</p>
              ) : null}
              <dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(term.translations).map(([code, value]) => (
                  <div key={code}>
                    <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                      {code}
                    </dt>
                    <dd className="text-sm" dir="auto">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      </section>
    </TranslationStudioShell>
  );
}
