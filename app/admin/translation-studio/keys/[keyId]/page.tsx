import { notFound } from "next/navigation";
import {
  approveTranslationAction,
  deprecateTranslationAction,
  rejectTranslationAction,
  restoreTranslationAction,
  saveTranslationDraftAction,
  submitTranslationReviewAction,
} from "../../../../actions/translationStudio";
import {
  applyProfessionalCandidateToDraftAction,
  generateProfessionalTranslationSuggestionAction,
  reviewCurrentTranslationProfessionallyAction,
} from "../../../../actions/translationStudioProfessionalGeneration";
import {
  buildProfessionalAiUxReadinessSummary,
  getTranslationStudio,
} from "../../../../../lib/translationStudio";
import { requireTranslationStudioAdmin } from "../../requireTranslationStudioAdmin";
import { scheduleTranslationStudioDualReadObservation } from "../../scheduleDualReadObservation";
import ProfessionalAiReadinessChip from "../../ProfessionalAiReadinessChip";
import ProfessionalSuggestionPanel from "../../ProfessionalSuggestionPanel";
import PendingSubmitButton from "../../PendingSubmitButton";
import TranslationStatusBadge from "../../TranslationStatusBadge";
import TranslationStudioShell, {
  TRANSLATION_STUDIO_BASE,
} from "../../TranslationStudioShell";

export const metadata = {
  title: "Key detail · Translation Studio | UMTUBA",
};

type PageProps = {
  params: Promise<{ keyId: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
};

function sanitizeStudioErrorCode(raw: string | undefined): string | null {
  if (!raw) return null;
  // Only allow known safe codes / short alphanumeric tokens — never raw provider bodies.
  if (/^[a-z0-9_.-]{1,80}$/i.test(raw)) return raw;
  return "professional_failed";
}

export default async function TranslationStudioKeyDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { supabase } = await requireTranslationStudioAdmin();
  scheduleTranslationStudioDualReadObservation({
    supabase,
    surface: "key_detail",
  });
  const { keyId } = await params;
  const query = (await searchParams) ?? {};
  const studio = getTranslationStudio();
  const key = studio.getKey(keyId);
  if (!key) notFound();

  const workflow = studio.workflow;
  const values = studio.listValuesForKey(key.id);
  const memoryHits = workflow
    .getSnapshot()
    .memory.filter(
      (m) =>
        m.sourceText.toLowerCase() === key.sourceText.toLowerCase()
    );
  const termHits = studio
    .listTerminology()
    .filter((t) =>
      key.sourceText.toLowerCase().includes(t.term.toLowerCase())
    );
  const suggestions = studio
    .listSuggestions()
    .filter((s) => s.keyId === key.id)
    .slice(0, 5);

  let aiMode: string | null = null;
  try {
    const { loadAiPlatformConfig } = await import(
      "../../../../../lib/ai/config"
    );
    aiMode = loadAiPlatformConfig().mode;
  } catch {
    aiMode = null;
  }
  const readinessSummary = buildProfessionalAiUxReadinessSummary({
    aiMode,
  });

  const safeError = sanitizeStudioErrorCode(query.error);

  return (
    <TranslationStudioShell title="Translation editor" subtitle={key.key}>
      <section className="space-y-4">
        <ProfessionalAiReadinessChip summary={readinessSummary} />

        {safeError ? (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {safeError}
          </p>
        ) : null}
        {query.professional_suggested === "1" ? (
          <p className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-50">
            Professional suggestion created
            {query.recommendation ? ` · ${query.recommendation}` : ""}
            {query.score ? ` · score ${query.score}` : ""}. Preview only —
            current translation unchanged. Not applied, approved, or published.
          </p>
        ) : null}
        {query.professional_reviewed === "1" ? (
          <p className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-50">
            Professional review (read-only)
            {query.recommendation ? ` · ${query.recommendation}` : ""}
            {query.score ? ` · score ${query.score}` : ""}
            {query.human === "1" ? " · human review required" : ""}
            {query.cache ? ` · cache ${query.cache}` : ""}
            {query.findings ? ` · ${query.findings}` : ""}. Value not mutated.
          </p>
        ) : null}
        {query.professional_applied === "1" ? (
          <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50">
            Professional candidate applied to DRAFT only
            {query.status ? ` · status=${query.status}` : ""}. Not submitted,
            approved, or published — use existing workflow controls next.
          </p>
        ) : null}

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <p className="font-mono text-xs text-white/45">{key.id}</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">{key.key}</h2>
          <p className="mt-2 text-sm text-white/70">{key.sourceText}</p>
        </div>

        {values.map((value) => {
          const history = workflow.getHistory(value.id).slice(0, 8);
          const latestSuggestion = suggestions.find(
            (s) => s.valueId === value.id || s.targetLanguage === value.language
          );
          const professionalSuggestion =
            suggestions.find(
              (s) =>
                (s.valueId === value.id ||
                  s.targetLanguage === value.language) &&
                s.quality.professionalQuality?.tag === "professional_quality_v1"
            ) ?? null;
          const conflicts =
            latestSuggestion?.quality.terminologyConflicts ?? [];
          const returnTo = `${TRANSLATION_STUDIO_BASE}/keys/${key.id}`;

          return (
            <div
              key={value.id}
              className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-black uppercase tracking-wide">
                  {value.language}
                </h2>
                <TranslationStatusBadge status={value.status} />
              </div>

              <form action={saveTranslationDraftAction} className="mt-4 space-y-3">
                <input type="hidden" name="valueId" value={value.id} />
                <input type="hidden" name="keyId" value={key.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <label className="block text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Translation editor
                  <textarea
                    name="text"
                    defaultValue={value.value}
                    rows={3}
                    dir="auto"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm text-white outline-none focus:border-blue-400/40"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="watch-focus-ring rounded-full bg-white px-4 py-2 text-xs font-black text-black"
                  >
                    Save draft
                  </button>
                </div>
              </form>

              <div className="mt-3 flex flex-wrap gap-2">
                <form action={submitTranslationReviewAction}>
                  <input type="hidden" name="valueId" value={value.id} />
                  <input type="hidden" name="keyId" value={key.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button
                    type="submit"
                    className="watch-focus-ring rounded-full border border-amber-400/30 px-3 py-1.5 text-xs font-bold text-amber-100"
                  >
                    Submit for review
                  </button>
                </form>
                <form action={approveTranslationAction}>
                  <input type="hidden" name="valueId" value={value.id} />
                  <input type="hidden" name="keyId" value={key.id} />
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
                  <input type="hidden" name="keyId" value={key.id} />
                  <input type="hidden" name="readyForPublish" value="1" />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button
                    type="submit"
                    className="watch-focus-ring rounded-full border border-violet-400/30 px-3 py-1.5 text-xs font-bold text-violet-100"
                  >
                    Approve → Ready for Publish
                  </button>
                </form>
                <form action={rejectTranslationAction}>
                  <input type="hidden" name="valueId" value={value.id} />
                  <input type="hidden" name="keyId" value={key.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button
                    type="submit"
                    className="watch-focus-ring rounded-full border border-rose-400/30 px-3 py-1.5 text-xs font-bold text-rose-100"
                  >
                    Reject
                  </button>
                </form>
                <form action={deprecateTranslationAction}>
                  <input type="hidden" name="valueId" value={value.id} />
                  <input type="hidden" name="keyId" value={key.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button
                    type="submit"
                    className="watch-focus-ring rounded-full border border-red-400/30 px-3 py-1.5 text-xs font-bold text-red-100"
                  >
                    Deprecate
                  </button>
                </form>
                <form action={restoreTranslationAction}>
                  <input type="hidden" name="valueId" value={value.id} />
                  <input type="hidden" name="keyId" value={key.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button
                    type="submit"
                    className="watch-focus-ring rounded-full border border-white/20 px-3 py-1.5 text-xs font-bold text-white/80"
                  >
                    Restore
                  </button>
                </form>
              </div>

              <div className="mt-4 rounded-2xl border border-violet-400/25 bg-violet-500/5 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-200/80">
                  Primary AI path · Professional generate + review
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <form action={generateProfessionalTranslationSuggestionAction}>
                    <input type="hidden" name="valueId" value={value.id} />
                    <input type="hidden" name="keyId" value={key.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <PendingSubmitButton
                      pendingLabel="Generating…"
                      className="watch-focus-ring rounded-full bg-violet-400 px-4 py-2 text-xs font-black text-black"
                    >
                      Professional generate + review
                    </PendingSubmitButton>
                  </form>
                  <form action={reviewCurrentTranslationProfessionallyAction}>
                    <input type="hidden" name="valueId" value={value.id} />
                    <input type="hidden" name="keyId" value={key.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <PendingSubmitButton
                      pendingLabel="Reviewing…"
                      className="watch-focus-ring rounded-full border border-fuchsia-400/40 px-3 py-1.5 text-xs font-bold text-fuchsia-100"
                    >
                      Review current professionally
                    </PendingSubmitButton>
                  </form>
                </div>
                <p className="mt-2 text-[10px] text-white/40">
                  Creates a preview suggestion or read-only review. Does not
                  auto-apply, approve, or publish.
                </p>
              </div>

              {conflicts.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-50">
                  <p className="font-bold">Terminology warnings</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                    {conflicts.map((c) => (
                      <li key={`${c.term}-${c.expected}`}>
                        “{c.term}” should use “{c.expected}” (not auto-replaced)
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {latestSuggestion &&
              latestSuggestion.quality.professionalQuality?.tag !==
                "professional_quality_v1" ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm opacity-70">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-white/40">
                    Legacy suggestion (non-professional)
                  </p>
                  <p className="mt-2 text-xs text-white/45">Candidate</p>
                  <p dir="auto">{latestSuggestion.candidateText}</p>
                  <p className="mt-2 text-[11px] text-white/35">
                    via {latestSuggestion.quality.providerVia}
                    {latestSuggestion.quality.reusedFromMemory
                      ? " · memory reuse"
                      : ""}
                  </p>
                </div>
              ) : null}

              {professionalSuggestion?.quality.professionalQuality ? (
                <ProfessionalSuggestionPanel
                  candidateText={professionalSuggestion.candidateText}
                  locale={value.language}
                  quality={professionalSuggestion.quality}
                  suggestionId={professionalSuggestion.id}
                  valueId={value.id}
                  keyId={key.id}
                  returnTo={returnTo}
                  applyAction={applyProfessionalCandidateToDraftAction}
                />
              ) : null}

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                    History
                  </p>
                  <ul className="mt-2 space-y-2 text-xs text-white/70">
                    {history.length === 0 ? (
                      <li>No versions yet.</li>
                    ) : (
                      history.map((h) => (
                        <li
                          key={h.id}
                          className="rounded-xl border border-white/10 px-3 py-2"
                        >
                          v{h.version} · {h.changeAction} · {h.status}
                          <div className="mt-1 truncate" dir="auto">
                            {h.value || "—"}
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                    Memory matches
                  </p>
                  <ul className="mt-2 space-y-2 text-xs text-white/70">
                    {memoryHits
                      .filter((m) => m.language === value.language)
                      .slice(0, 5)
                      .map((m) => (
                        <li
                          key={m.id}
                          className="rounded-xl border border-white/10 px-3 py-2"
                          dir="auto"
                        >
                          {m.translatedText}
                        </li>
                      ))}
                    {memoryHits.filter((m) => m.language === value.language)
                      .length === 0 ? (
                      <li>No memory hit for this language.</li>
                    ) : null}
                  </ul>
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                    Terminology hits
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    {termHits.length === 0
                      ? "None"
                      : termHits.map((t) => t.term).join(", ")}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </TranslationStudioShell>
  );
}
