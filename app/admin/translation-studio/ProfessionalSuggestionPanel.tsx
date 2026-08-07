/**
 * Compact professional quality display for Translation Studio suggestion cards.
 */

import type { SuggestionQualityMetadata } from "../../../lib/translationStudio/types";

const DIMENSION_LABELS: Record<string, string> = {
  semantic_accuracy: "Semantic",
  terminology_compliance: "Terminology",
  contextual_fit: "Context",
  fluency_naturalness: "Fluency",
  ui_conciseness: "UI length",
  consistency: "Consistency",
  grammar_spelling: "Grammar",
  locale_conventions: "Locale",
  placeholder_integrity: "Placeholders",
  formatting_integrity: "Formatting",
};

const PRIORITY_DIMS = [
  "semantic_accuracy",
  "terminology_compliance",
  "contextual_fit",
  "fluency_naturalness",
  "ui_conciseness",
  "consistency",
  "grammar_spelling",
  "locale_conventions",
  "placeholder_integrity",
  "formatting_integrity",
];

export default function ProfessionalSuggestionPanel(props: {
  candidateText: string;
  locale: string;
  quality: SuggestionQualityMetadata;
}) {
  const pq = props.quality.professionalQuality;
  if (!pq || pq.tag !== "professional_quality_v1") {
    return null;
  }

  const report = pq.report as
    | {
        deterministicFindings?: Array<{
          code: string;
          severity: string;
          message: string;
        }>;
        reviewerFindings?: Array<{
          code: string;
          severity: string;
          message: string;
        }>;
        glossaryCompliance?: {
          applicableTerms: number;
          blockingGlossaryFindings: number;
        };
        dimensionScores?: Array<{ dimension: string; score: number }>;
      }
    | undefined;

  const dims = PRIORITY_DIMS.map((id) => {
    const hit = report?.dimensionScores?.find((d) => d.dimension === id);
    return { id, score: hit?.score ?? null, label: DIMENSION_LABELS[id] ?? id };
  }).filter((d) => d.score != null);

  const blockers = (report?.deterministicFindings ?? []).filter(
    (f) => f.severity === "blocking"
  );
  const major = [
    ...(report?.deterministicFindings ?? []),
    ...(report?.reviewerFindings ?? []),
  ]
    .filter((f) => f.severity === "blocking" || f.severity === "error" || f.severity === "warning")
    .slice(0, 5);

  const recColor =
    pq.recommendation === "PASS"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
      : pq.recommendation === "BLOCK"
        ? "border-rose-400/30 bg-rose-500/10 text-rose-100"
        : "border-amber-400/30 bg-amber-500/10 text-amber-100";

  return (
    <div className="mt-4 rounded-2xl border border-violet-400/25 bg-violet-500/5 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-bold text-violet-100">Professional quality</p>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${recColor}`}
        >
          {pq.recommendation}
        </span>
        {pq.humanReviewRequired ? (
          <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-100">
            Human review required
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-white/45">Candidate · {props.locale}</p>
      <p className="mt-1 text-base text-white" dir="auto">
        {props.candidateText}
      </p>

      <p className="mt-3 text-xs text-white/60">
        Overall score{" "}
        <span className="font-black text-white">{pq.overallScore}</span>
        {pq.providerId ? (
          <>
            {" "}
            · {pq.providerId}
            {pq.modelId ? ` / ${pq.modelId}` : ""}
          </>
        ) : null}
        {pq.qualityProfileId ? <> · profile {pq.qualityProfileId}</> : null}
        {pq.contextPackId ? <> · pack {pq.contextPackId}</> : null}
      </p>

      {dims.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {dims.map((d) => (
            <div
              key={d.id}
              className="rounded-xl border border-white/10 bg-black/30 px-2 py-1.5 text-[10px]"
            >
              <div className="text-white/45">{d.label}</div>
              <div className="font-black text-white">{d.score}</div>
            </div>
          ))}
        </div>
      ) : null}

      {report?.glossaryCompliance ? (
        <p className="mt-3 text-[11px] text-white/55">
          Glossary: {report.glossaryCompliance.applicableTerms} applicable ·{" "}
          {report.glossaryCompliance.blockingGlossaryFindings} blocking
        </p>
      ) : null}

      {blockers.length > 0 ? (
        <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-2 text-[11px] text-rose-50">
          <p className="font-bold">Deterministic blockers</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {blockers.map((b) => (
              <li key={b.code + b.message}>
                {b.code}: {b.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {major.length > 0 ? (
        <div className="mt-3 text-[11px] text-white/70">
          <p className="font-bold text-white/80">Major findings</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {major.map((f) => (
              <li key={f.code + f.message}>
                [{f.severity}] {f.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {pq.suggestedRevision ? (
        <div className="mt-3 rounded-xl border border-sky-400/20 bg-sky-500/5 p-2 text-[11px]">
          <p className="font-bold text-sky-100">Suggested revision (not applied)</p>
          <p className="mt-1" dir="auto">
            {pq.suggestedRevision}
          </p>
        </div>
      ) : null}

      <p className="mt-3 text-[10px] text-white/35">
        AI cannot approve or publish. Use existing Approve / Reject controls after human judgment.
      </p>
    </div>
  );
}
