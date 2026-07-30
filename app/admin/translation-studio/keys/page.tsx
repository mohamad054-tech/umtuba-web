import Link from "next/link";
import { getTranslationStudio } from "../../../../lib/translationStudio";
import { requireTranslationStudioAdmin } from "../requireTranslationStudioAdmin";
import TranslationStatusBadge from "../TranslationStatusBadge";
import TranslationStudioShell, {
  TRANSLATION_STUDIO_BASE,
} from "../TranslationStudioShell";

export const metadata = {
  title: "Keys · Translation Studio | UMTUBA",
};

type PageProps = {
  searchParams?: Promise<{ namespace?: string }>;
};

export default async function TranslationStudioKeysPage({
  searchParams,
}: PageProps) {
  await requireTranslationStudioAdmin();
  const params = (await searchParams) ?? {};
  const studio = getTranslationStudio();
  const namespaceId = params.namespace?.trim() || undefined;
  const keys = studio.listKeys(namespaceId);

  return (
    <TranslationStudioShell title="Keys" subtitle="Translation keys">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h1 className="text-xl font-black">
          Keys{namespaceId ? ` · ${namespaceId}` : ""}
        </h1>
        <ul className="mt-4 divide-y divide-white/10">
          {keys.map((key) => {
            const values = studio.listValuesForKey(key.id);
            const approved = values.filter((v) => v.status === "approved").length;
            const missing = values.filter((v) => v.status === "missing").length;
            return (
              <li key={key.id} className="py-3">
                <Link
                  href={`${TRANSLATION_STUDIO_BASE}/keys/${key.id}`}
                  className="watch-focus-ring block rounded-xl px-2 py-2 hover:bg-white/5"
                >
                  <p className="font-mono text-sm font-bold text-blue-100">
                    {key.key}
                  </p>
                  <p className="mt-1 text-sm text-white/70">{key.sourceText}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <TranslationStatusBadge status="approved" />
                    <span className="text-[11px] text-white/45">
                      {approved} approved · {missing} missing
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </TranslationStudioShell>
  );
}
