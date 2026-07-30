import Link from "next/link";
import { getTranslationStudio } from "../../../lib/translationStudio";
import { requireTranslationStudioAdmin } from "./requireTranslationStudioAdmin";
import TranslationStudioShell, {
  TRANSLATION_STUDIO_BASE,
} from "./TranslationStudioShell";

export const metadata = {
  title: "Translation Studio | UMTUBA",
};

export default async function TranslationStudioOverviewPage() {
  await requireTranslationStudioAdmin();
  const studio = getTranslationStudio();
  const snap = studio.getSnapshot();

  const cards = [
    {
      label: "Languages",
      value: String(snap.languages.length),
      href: `${TRANSLATION_STUDIO_BASE}/languages`,
    },
    {
      label: "Namespaces",
      value: String(snap.namespaces.length),
      href: `${TRANSLATION_STUDIO_BASE}/namespaces`,
    },
    {
      label: "Keys",
      value: String(snap.keys.length),
      href: `${TRANSLATION_STUDIO_BASE}/keys`,
    },
    {
      label: "Terminology",
      value: String(snap.terminology.length),
      href: `${TRANSLATION_STUDIO_BASE}/terminology`,
    },
    {
      label: "Memory entries",
      value: String(snap.memory.length),
      href: `${TRANSLATION_STUDIO_BASE}/keys`,
    },
  ];

  return (
    <TranslationStudioShell title="Translation Studio">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h1 className="text-2xl font-black tracking-tight">
          Internal source of truth
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/55">
          Foundation for languages, namespaces, keys, Translation Memory,
          terminology, and AI suggestions routed through Shared AI Core. No
          public product and no automatic publishing.
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
      </section>
    </TranslationStudioShell>
  );
}
