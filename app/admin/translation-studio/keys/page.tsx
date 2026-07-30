import Link from "next/link";
import {
  APP_SHELL_NAMESPACES,
  getTranslationStudio,
} from "../../../../lib/translationStudio";
import { requireTranslationStudioAdmin } from "../requireTranslationStudioAdmin";
import TranslationStatusBadge from "../TranslationStatusBadge";
import TranslationStudioShell, {
  TRANSLATION_STUDIO_BASE,
} from "../TranslationStudioShell";

export const metadata = {
  title: "Keys · Translation Studio | UMTUBA",
};

type PageProps = {
  searchParams?: Promise<{ namespace?: string; status?: string }>;
};

export default async function TranslationStudioKeysPage({
  searchParams,
}: PageProps) {
  await requireTranslationStudioAdmin();
  const params = (await searchParams) ?? {};
  const studio = getTranslationStudio();
  const namespaceId = params.namespace?.trim() || undefined;
  const statusFilter = params.status?.trim() || undefined;
  const keys = studio.listKeys(namespaceId);

  let approvedTotal = 0;
  let needsReviewTotal = 0;
  let missingTotal = 0;

  const rows = keys.map((key) => {
    const values = studio.listValuesForKey(key.id);
    const approved = values.filter(
      (v) => v.status === "approved" || v.status === "ready_for_publish"
    ).length;
    const missing = values.filter((v) => v.status === "missing").length;
    const needsReview = values.filter(
      (v) => v.status === "needs_review"
    ).length;
    approvedTotal += approved;
    needsReviewTotal += needsReview;
    missingTotal += missing;
    return { key, values, approved, missing, needsReview };
  });

  const filtered = statusFilter
    ? rows.filter((row) => {
        if (statusFilter === "approved") return row.approved > 0;
        if (statusFilter === "needs_review") return row.needsReview > 0;
        if (statusFilter === "missing") return row.missing > 0;
        return true;
      })
    : rows;

  return (
    <TranslationStudioShell title="Keys" subtitle="App Shell inventory">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h1 className="text-xl font-black">
          Keys{namespaceId ? ` · ${namespaceId}` : ""}
        </h1>
        <p className="mt-1 text-sm text-white/55">
          {approvedTotal} approved · {needsReviewTotal} needs review ·{" "}
          {missingTotal} missing
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`${TRANSLATION_STUDIO_BASE}/keys`}
            className="watch-focus-ring rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold"
          >
            All
          </Link>
          {APP_SHELL_NAMESPACES.map((ns) => (
            <Link
              key={ns}
              href={`${TRANSLATION_STUDIO_BASE}/keys?namespace=${ns}`}
              className={`watch-focus-ring rounded-full border px-3 py-1.5 text-xs font-bold ${
                namespaceId === ns
                  ? "border-blue-400/40 bg-blue-500/15 text-blue-100"
                  : "border-white/15 text-white/80"
              }`}
            >
              {ns}
            </Link>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              ["approved", "Approved"],
              ["needs_review", "Needs review"],
              ["missing", "Missing"],
            ] as const
          ).map(([status, label]) => (
            <Link
              key={status}
              href={`${TRANSLATION_STUDIO_BASE}/keys?${
                namespaceId ? `namespace=${namespaceId}&` : ""
              }status=${status}`}
              className={`watch-focus-ring rounded-full border px-3 py-1.5 text-xs font-bold ${
                statusFilter === status
                  ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
                  : "border-white/10 text-white/60"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <ul className="mt-4 divide-y divide-white/10">
          {filtered.map(({ key, approved, missing, needsReview }) => (
            <li key={key.id} className="py-3">
              <Link
                href={`${TRANSLATION_STUDIO_BASE}/keys/${key.id}`}
                className="watch-focus-ring block rounded-xl px-2 py-2 hover:bg-white/5"
              >
                <p className="font-mono text-sm font-bold text-blue-100">
                  {key.key}
                </p>
                <p className="mt-1 text-sm text-white/70">{key.sourceText}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/45">
                  <TranslationStatusBadge status="approved" />
                  <span>
                    {approved} approved · {needsReview} needs review ·{" "}
                    {missing} missing
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </TranslationStudioShell>
  );
}
