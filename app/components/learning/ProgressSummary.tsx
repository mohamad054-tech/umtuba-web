"use client";

import {
  type LearningLearnerCourseOutline,
} from "../../../lib/learning/learnerDelivery";
import { useTranslation } from "../i18n";
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

export default function ProgressSummary({ progress }: ProgressSummaryProps) {
  const { t } = useTranslation();
  if (!progress) {
    return (
      <p className="text-sm text-white/45">
        {t("learning.outline.progressUnavailable")}
      </p>
    );
  }

  const statusLabel =
    progress.status === "completed"
      ? t("learning.hub.completed")
      : progress.status === "in_progress"
        ? t("learning.hub.inProgress")
        : t("learning.hub.notStarted");

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          {t("learning.outline.courseProgress")}
        </p>
        <LearningStatusBadge tone={statusTone(progress.status)}>
          {statusLabel}
        </LearningStatusBadge>
      </div>
      <div className="mt-3">
        <LearningProgressBar percent={progress.percent_complete} />
      </div>
      <p className="mt-2 text-sm text-white/70">
        {t("learning.outline.lessonsCount", {
          values: {
            completed: progress.completed_lessons_count,
            total: progress.total_lessons_count,
          },
        })}
      </p>
    </div>
  );
}
