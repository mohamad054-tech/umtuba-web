/**
 * Professional AI readiness chip for Translation Studio key detail.
 * Sanitized operational status only — no secrets / raw errors.
 */

import type { ProfessionalAiUxReadinessSummary } from "../../../lib/translationStudio/professionalQuality/professionalAiUxReadiness";

export default function ProfessionalAiReadinessChip(props: {
  summary: ProfessionalAiUxReadinessSummary;
}) {
  const s = props.summary;
  const statusClass =
    s.status === "READY"
      ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-50"
      : s.status === "DEGRADED"
        ? "border-amber-400/35 bg-amber-500/10 text-amber-50"
        : "border-rose-400/35 bg-rose-500/10 text-rose-50";

  const modeLabel =
    s.modeLabel === "live"
      ? "Live"
      : s.modeLabel === "offline_heuristic"
        ? "Offline / heuristic"
        : "Unknown mode";

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${statusClass}`}
      data-testid="professional-ai-readiness"
      data-status={s.status}
      data-mode={s.modeLabel}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/50">
          Professional AI
        </span>
        <span className="rounded-full border border-white/20 bg-black/25 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide">
          {s.status.replace("_", " ")}
        </span>
        <span className="rounded-full border border-white/15 bg-black/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/80">
          {modeLabel}
        </span>
      </div>
      <p className="mt-2 text-xs text-white/80">{s.note}</p>
      <p className="mt-1.5 text-[11px] text-white/55">
        Generator: {s.generatorProvider}
        {s.generatorModelId ? ` / ${s.generatorModelId}` : s.generatorModelConfigured ? " / model set" : " / model unset"}
        {" · "}
        Reviewer: {s.reviewerProvider}
        {s.reviewerModelId ? ` / ${s.reviewerModelId}` : s.reviewerModelConfigured ? " / model set" : " / model unset"}
      </p>
      <p className="mt-1 text-[10px] text-white/40">
        AI cannot approve or publish. Authority locked: approve=
        {String(s.authority.generatorCanApprove)}, publish=
        {String(s.authority.reviewerCanPublish)}.
      </p>
    </div>
  );
}
