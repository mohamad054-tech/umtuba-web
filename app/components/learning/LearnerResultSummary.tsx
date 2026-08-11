import type { LearningLearnerAttemptResultView } from "../../../lib/learning/learnerResultDelivery";

type LearnerResultSummaryProps = {
  view: LearningLearnerAttemptResultView;
};

/**
 * Aggregate-only learner result. Never shows per-question correctness or keys.
 */
export default function LearnerResultSummary({
  view,
}: LearnerResultSummaryProps) {
  if (view.visibility !== "available" || !view.result) {
    return null;
  }

  const { score_earned, score_max, percentage, passed, scored_at } = view.result;

  return (
    <div
      className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-50"
      data-testid="learner-result-summary"
      role="status"
      aria-live="polite"
      aria-label="Assessment result"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-200/80">
        Result
      </p>
      <p className="mt-1 text-lg font-black tracking-tight">
        {formatScore(score_earned)} / {formatScore(score_max)}
        <span className="ml-2 text-base font-bold text-emerald-100/90">
          ({formatPercentage(percentage)}%)
        </span>
      </p>
      {passed === true ? (
        <p className="mt-1 text-sm font-semibold text-emerald-200">Passed</p>
      ) : null}
      {passed === false ? (
        <p className="mt-1 text-sm font-semibold text-amber-200">Not passed</p>
      ) : null}
      {scored_at ? (
        <p className="mt-1 text-xs text-emerald-100/70">
          Scored {formatScoredAt(scored_at)}
        </p>
      ) : null}
    </div>
  );
}

function formatScore(n: number) {
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function formatPercentage(n: number) {
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function formatScoredAt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "recently";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
