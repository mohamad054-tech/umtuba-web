import {
  type LearningLearnerCourseOutline,
} from "../../../lib/learning/learnerDelivery";
import { LearningProgressBar, LearningStatusBadge } from "./ds";

type ProgressSummaryProps = {
  progress: LearningLearnerCourseOutline["progress"];
};

function statusTone(
  status: string
): "neutral" | "success" | "warning" {
  if (status === "completed") return "success";
  if (status === "in_progress") return "warning";
  return "neutral";
}

function statusLabel(status: string) {
  if (status === "completed") return "Completed";
  if (status === "in_progress") return "In progress";
  return "Not started";
}

export default function ProgressSummary({ progress }: ProgressSummaryProps) {
  if (!progress) {
    return (
      <p className="text-sm text-white/45">Progress is not available yet.</p>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          Course progress
        </p>
        <LearningStatusBadge tone={statusTone(progress.status)}>
          {statusLabel(progress.status)}
        </LearningStatusBadge>
      </div>
      <div className="mt-3">
        <LearningProgressBar percent={progress.percent_complete} />
      </div>
      <p className="mt-2 text-sm text-white/70">
        {progress.completed_lessons_count} of {progress.total_lessons_count}{" "}
        lessons
      </p>
    </div>
  );
}
