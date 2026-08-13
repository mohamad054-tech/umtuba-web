import {
  attemptStatusMessage,
  type LearningLearnerAttemptView,
} from "../../../lib/learning/learnerDelivery";
import {
  learnerResultStatusMessage,
  type LearningLearnerAttemptResultView,
} from "../../../lib/learning/learnerResultDelivery";
import LearnerResultSummary from "./LearnerResultSummary";

type AttemptStatusBannerProps = {
  status: LearningLearnerAttemptView["status"];
  remainingSeconds?: number | null;
  /** When present for submitted attempts, drives result messaging. */
  resultView?: LearningLearnerAttemptResultView | null;
};

export default function AttemptStatusBanner({
  status,
  remainingSeconds = null,
  resultView = null,
}: AttemptStatusBannerProps) {
  const message =
    status === "submitted" && resultView
      ? learnerResultStatusMessage(
          resultView.visibility,
          attemptStatusMessage("submitted")
        )
      : attemptStatusMessage(status);

  const tone =
    status === "submitted"
      ? resultView?.visibility === "available"
        ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
        : resultView?.visibility === "pending_score"
          ? "border-sky-400/25 bg-sky-500/10 text-sky-100"
          : "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
      : status === "active"
        ? "border-sky-400/25 bg-sky-500/10 text-sky-100"
        : "border-amber-400/25 bg-amber-500/10 text-amber-100";

  return (
    <div role="status" className={`rounded-2xl border px-4 py-3 text-sm ${tone}`}>
      <p>{message}</p>
      {status === "active" && remainingSeconds != null ? (
        <p className="mt-1 text-sm font-semibold tabular-nums opacity-90">
          Time remaining: {formatSeconds(remainingSeconds)}
        </p>
      ) : null}
      {status === "submitted" && resultView ? (
        <LearnerResultSummary view={resultView} />
      ) : null}
    </div>
  );
}

function formatSeconds(total: number) {
  const s = Math.max(0, Math.floor(total));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
