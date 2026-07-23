import {
  type LearningLearnerCourseOutline,
} from "../../../lib/learning/learnerDelivery";

type ProgressSummaryProps = {
  progress: LearningLearnerCourseOutline["progress"];
};

export default function ProgressSummary({ progress }: ProgressSummaryProps) {
  if (!progress) {
    return (
      <p className="text-sm text-white/45">Progress is not available yet.</p>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
        Course progress
      </p>
      <p className="mt-1 text-sm text-white/80">
        {progress.completed_lessons_count} of {progress.total_lessons_count}{" "}
        lessons · {Math.round(progress.percent_complete)}% · {progress.status}
      </p>
    </div>
  );
}
