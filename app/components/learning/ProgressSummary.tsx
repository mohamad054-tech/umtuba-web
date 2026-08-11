import {
  type LearningLearnerCourseOutline,
} from "../../../lib/learning/learnerDelivery";

type ProgressSummaryProps = {
  progress: LearningLearnerCourseOutline["progress"];
};

export default function ProgressSummary({ progress }: ProgressSummaryProps) {
  if (!progress) {
    return (
      <p className="text-sm text-white/60" role="status">
        Progress is not available yet.
      </p>
    );
  }

  const percent = Math.round(progress.percent_complete);
  const label = `${progress.completed_lessons_count} of ${progress.total_lessons_count} lessons · ${percent}% · ${progress.status}`;

  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
      role="group"
      aria-labelledby="course-progress-heading"
    >
      <p
        id="course-progress-heading"
        className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/55"
      >
        Course progress
      </p>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, Math.max(0, percent))}
        aria-label="Course completion percentage"
      >
        <div
          className="h-full rounded-full bg-sky-400"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-white/85">{label}</p>
    </div>
  );
}
