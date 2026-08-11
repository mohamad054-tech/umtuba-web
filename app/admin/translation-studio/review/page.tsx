import Link from "next/link";
import {
  approveTranslationAction,
  rejectTranslationAction,
  submitTranslationReviewAction,
} from "../../../actions/translationStudio";
import { getTranslationStudio } from "../../../../lib/translationStudio";
import { requireTranslationStudioAdmin } from "../requireTranslationStudioAdmin";
import TranslationStatusBadge from "../TranslationStatusBadge";
import TranslationStudioShell, {
  TRANSLATION_STUDIO_BASE,
} from "../TranslationStudioShell";

export const metadata = {
  title: "Review queue · Translation Studio | UMTUBA",
};

type PageProps = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function TranslationStudioReviewPage({
  searchParams,
}: PageProps) {
  await requireTranslationStudioAdmin();
  const query = (await searchParams) ?? {};
  const studio = getTranslationStudio();
  const snap = studio.getSnapshot();
  const keyById = new Map(snap.keys.map((k) => [k.id, k]));
  const queue = studio.workflow.listReviewQueue();

  return (
    <TranslationStudioShell
      title="Review queue"
      subtitle="Draft / AI suggested / Needs review"
    >
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        {query.error ? (
          <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {query.error}
          </p>
        ) : null}
        <h2 className="text-xl font-black">
          Review queue · {queue.length}
        </h2>
        <p className="mt-1 text-sm text-white/55">
          Human approval required. AI never auto-approves.
        </p>

        {queue.length === 0 ? (
          <p className="mt-6 text-sm text-white/50">Queue is empty.</p>
        ) : (
          <ul className="mt-6 divide-y divide-white/10">
            {queue.map((value) => {
              const key = keyById.get(value.keyId);
              const returnTo = `${TRANSLATION_STUDIO_BASE}/review`;
              return (
                <li key={value.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`${TRANSLATION_STUDIO_BASE}/keys/${value.keyId}`}
                        className="watch-focus-ring font-mono text-sm font-bold text-blue-100"
                      >
                        {key?.key ?? value.keyId}
                      </Link>
                      <p className="mt-1 text-xs text-white/45">
                        {value.language.toUpperCase()} · {value.id}
                      </p>
                      <p className="mt-2 text-sm text-white/70" dir="auto">
                        {value.value || "—"}
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        Source: {key?.sourceText ?? "—"}
                      </p>
                    </div>
                    <TranslationStatusBadge status={value.status} />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {value.status === "draft" ||
                    value.status === "ai_suggested" ? (
                      <form action={submitTranslationReviewAction}>
                        <input type="hidden" name="valueId" value={value.id} />
                        <input type="hidden" name="keyId" value={value.keyId} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <button
                          type="submit"
                          className="watch-focus-ring rounded-full border border-amber-400/30 px-3 py-1.5 text-xs font-bold text-amber-100"
                        >
                          Submit for review
                        </button>
                      </form>
                    ) : null}
                    <form action={approveTranslationAction}>
                      <input type="hidden" name="valueId" value={value.id} />
                      <input type="hidden" name="keyId" value={value.keyId} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <button
                        type="submit"
                        className="watch-focus-ring rounded-full border border-emerald-400/30 px-3 py-1.5 text-xs font-bold text-emerald-100"
                      >
                        Approve
                      </button>
                    </form>
                    <form action={approveTranslationAction}>
                      <input type="hidden" name="valueId" value={value.id} />
                      <input type="hidden" name="keyId" value={value.keyId} />
                      <input type="hidden" name="readyForPublish" value="1" />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <button
                        type="submit"
                        className="watch-focus-ring rounded-full border border-violet-400/30 px-3 py-1.5 text-xs font-bold text-violet-100"
                      >
                        Ready for Publish
                      </button>
                    </form>
                    <form action={rejectTranslationAction}>
                      <input type="hidden" name="valueId" value={value.id} />
                      <input type="hidden" name="keyId" value={value.keyId} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <button
                        type="submit"
                        className="watch-focus-ring rounded-full border border-rose-400/30 px-3 py-1.5 text-xs font-bold text-rose-100"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </TranslationStudioShell>
  );
}
