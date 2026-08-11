import Link from "next/link";
import { getTranslationStudio } from "../../../../lib/translationStudio";
import { requireTranslationStudioAdmin } from "../requireTranslationStudioAdmin";
import TranslationStudioShell, {
  TRANSLATION_STUDIO_BASE,
} from "../TranslationStudioShell";

export const metadata = {
  title: "Namespaces · Translation Studio | UMTUBA",
};

export default async function TranslationStudioNamespacesPage() {
  await requireTranslationStudioAdmin();
  const studio = getTranslationStudio();
  const namespaces = studio.getSnapshot().namespaces;

  return (
    <TranslationStudioShell title="Namespaces" subtitle="Key groupings">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h2 className="text-xl font-black">Namespaces</h2>
        <ul className="mt-4 space-y-3">
          {namespaces.map((ns) => {
            const count = studio.listKeys(ns.id).length;
            return (
              <li
                key={ns.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black">{ns.name}</p>
                    <p className="mt-1 text-xs text-white/45">{ns.description}</p>
                  </div>
                  <Link
                    href={`${TRANSLATION_STUDIO_BASE}/keys?namespace=${encodeURIComponent(ns.id)}`}
                    className="watch-focus-ring text-xs font-bold text-blue-200"
                  >
                    {count} keys →
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </TranslationStudioShell>
  );
}
