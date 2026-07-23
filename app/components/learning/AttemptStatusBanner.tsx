import {
  attemptStatusMessage,
  type LearningLearnerAttemptView,
} from "../../../lib/learning/learnerDelivery";

type AttemptStatusBannerProps = {
  status: LearningLearnerAttemptView["status"];
  remainingSeconds?: number | null;
};

export default function AttemptStatusBanner({
  status,
  remainingSeconds = null,
}: AttemptStatusBannerProps) {
  const message = attemptStatusMessage(status);
  const tone =
    status === "submitted"
      ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
      : status === "active"
        ? "border-sky-400/25 bg-sky-500/10 text-sky-100"
        : "border-amber-400/25 bg-amber-500/10 text-amber-100";

  return (
    <div role="status" className={`rounded-2xl border px-4 py-3 text-sm ${tone}`}>
      <p>{message}</p>
      {status === "active" && remainingSeconds != null ? (
        <p className="mt-1 text-xs opacity-80">
          Time remaining: {formatSeconds(remainingSeconds)}
        </p>
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
