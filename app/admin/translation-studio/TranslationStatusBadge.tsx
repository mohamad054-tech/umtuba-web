import type { TranslationValueStatus } from "../../../lib/translationStudio";

const STYLES: Record<TranslationValueStatus, string> = {
  missing: "border-white/15 bg-white/5 text-white/60",
  draft: "border-zinc-400/30 bg-zinc-500/10 text-zinc-100",
  ai_suggested: "border-sky-400/30 bg-sky-500/10 text-sky-100",
  needs_review: "border-amber-400/30 bg-amber-500/10 text-amber-100",
  approved: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
  rejected: "border-rose-400/30 bg-rose-500/10 text-rose-100",
  deprecated: "border-red-400/25 bg-red-500/10 text-red-100",
  ready_for_publish: "border-violet-400/30 bg-violet-500/10 text-violet-100",
};

const LABELS: Record<TranslationValueStatus, string> = {
  missing: "Missing",
  draft: "Draft",
  ai_suggested: "AI Suggested",
  needs_review: "Needs Review",
  approved: "Approved",
  rejected: "Rejected",
  deprecated: "Deprecated",
  ready_for_publish: "Ready for Publish",
};

export default function TranslationStatusBadge({
  status,
}: {
  status: TranslationValueStatus;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
