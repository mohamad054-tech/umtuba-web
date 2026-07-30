import { notFound } from "next/navigation";
import { getTranslationStudio } from "../../../../../lib/translationStudio";
import { requireTranslationStudioAdmin } from "../../requireTranslationStudioAdmin";
import TranslationStatusBadge from "../../TranslationStatusBadge";
import TranslationStudioShell from "../../TranslationStudioShell";

export const metadata = {
  title: "Key detail · Translation Studio | UMTUBA",
};

type PageProps = {
  params: Promise<{ keyId: string }>;
};

export default async function TranslationStudioKeyDetailPage({
  params,
}: PageProps) {
  await requireTranslationStudioAdmin();
  const { keyId } = await params;
  const studio = getTranslationStudio();
  const key = studio.getKey(keyId);
  if (!key) notFound();

  const values = studio.listValuesForKey(key.id);
  const memoryHits = studio.memory.findDuplicates(key.sourceText);
  const termHits = studio.terminology.findInSourceText(key.sourceText);

  // Read-only suggestion panel: show memory reuse preview (no live AI call).
  const arMemory = studio.memory.lookup({
    sourceText: key.sourceText,
    language: "ar",
  });

  return (
    <TranslationStudioShell title="Translation detail" subtitle={key.key}>
      <section className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <p className="font-mono text-xs text-white/45">{key.id}</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">{key.key}</h1>
          <p className="mt-2 text-sm text-white/70">{key.sourceText}</p>
          {key.description ? (
            <p className="mt-2 text-xs text-white/45">{key.description}</p>
          ) : null}
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="text-lg font-black">Values</h2>
          <ul className="mt-3 divide-y divide-white/10">
            {values.map((value) => (
              <li
                key={value.id}
                className="flex flex-wrap items-start justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">
                    {value.language}
                  </p>
                  <p className="mt-1 text-sm text-white/85" dir="auto">
                    {value.value || "—"}
                  </p>
                </div>
                <TranslationStatusBadge status={value.status} />
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[28px] border border-sky-400/20 bg-sky-500/5 p-5 md:p-7">
          <h2 className="text-lg font-black">Suggestion panel</h2>
          <p className="mt-1 text-xs text-white/55">
            Pipeline: source → provider (via aiService) → candidate → quality →
            human approval → Translation Memory. Automatic publishing is
            disabled.
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-white/45">Memory reuse (ar)</dt>
              <dd className="mt-1 font-bold" dir="auto">
                {arMemory?.translatedText ?? "No approved memory hit"}
              </dd>
            </div>
            <div>
              <dt className="text-white/45">Duplicate fingerprints</dt>
              <dd className="mt-1 font-bold">{memoryHits.length}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-white/45">Terminology hits</dt>
              <dd className="mt-1">
                {termHits.length === 0
                  ? "None"
                  : termHits.map((t) => t.term).join(", ")}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </TranslationStudioShell>
  );
}
