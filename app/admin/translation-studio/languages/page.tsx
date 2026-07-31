import { getTranslationStudio } from "../../../../lib/translationStudio";
import { requireTranslationStudioAdmin } from "../requireTranslationStudioAdmin";
import TranslationStudioShell from "../TranslationStudioShell";

export const metadata = {
  title: "Languages · Translation Studio | UMTUBA",
};

export default async function TranslationStudioLanguagesPage() {
  await requireTranslationStudioAdmin();
  const languages = getTranslationStudio().getSnapshot().languages;

  return (
    <TranslationStudioShell title="Languages" subtitle="Studio locales">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h1 className="text-xl font-black">Supported languages</h1>
        <ul className="mt-4 divide-y divide-white/10">
          {languages.map((lang) => (
            <li
              key={lang.code}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div>
                <p className="font-bold">
                  {lang.name}{" "}
                  <span className="text-white/45">({lang.nativeName})</span>
                </p>
                <p className="text-xs text-white/45">
                  code={lang.code} · dir={lang.direction}
                </p>
              </div>
              <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-100">
                {lang.enabled ? "Enabled" : "Disabled"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </TranslationStudioShell>
  );
}
