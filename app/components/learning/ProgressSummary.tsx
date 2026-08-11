import {
  type LearningLearnerCourseOutline,
} from "../../../lib/learning/learnerDelivery";

type ProgressSummaryProps = {
  progress: LearningLearnerCourseOutline["progress"];
};

export default function ProgressSummary({ progress }: ProgressSummaryProps) {
  if (!progress) {
    return (
      <p className="text-sm text-white/45" role="status">
        Progress is not available yet.
      </p>
    );
  }

  const value = Math.max(
    0,
    Math.min(100, Math.round(progress.percent_complete))
  );

  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
      data-testid="learning-progress-summary"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
        Course progress
      </p>
      <p className="mt-1 text-sm text-white/80" id="learning-progress-summary-text">
        {progress.completed_lessons_count} of {progress.total_lessons_count}{" "}
        lessons · {value}% · {progress.status}
      </p>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-labelledby="learning-progress-summary-text"
        data-testid="learning-progress-summary-bar"
      >
        <div
          className="h-full rounded-full bg-sky-400"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
