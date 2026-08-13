import {
  type LearningLearnerCourseOutline,
} from "../../../lib/learning/learnerDelivery";
import LearningProgressBar from "./ui/LearningProgressBar";
import { learningCardQuiet, learningEyebrow } from "./ui/tokens";

type ProgressSummaryProps = {
  progress: LearningLearnerCourseOutline["progress"];
};

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
    <div className={`${learningCardQuiet} px-4 py-3`}>
      <p className={learningEyebrow}>Course progress</p>
      <div className="mt-3">
        <LearningProgressBar
          percent={progress.percent_complete}
          label={`${progress.completed_lessons_count} of ${progress.total_lessons_count} lessons · ${statusLabel(progress.status)}`}
        />
      </div>
    </div>
  );
}
