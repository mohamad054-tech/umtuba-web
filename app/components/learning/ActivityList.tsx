"use client";

import Link from "next/link";
import {
  LEARNING_LEARNER_ROUTES,
  resolveLearnerActivityTarget,
  type LearningLearnerActivitySummary,
} from "../../../lib/learning/learnerDelivery";
import { useTranslation } from "../i18n";

type ActivityListProps = {
  activities: LearningLearnerActivitySummary[];
};

export default function ActivityList({ activities }: ActivityListProps) {
  const { t } = useTranslation();
  if (activities.length === 0) {
    return (
      <p className="text-sm text-white/45">{t("learning.lesson.noActivities")}</p>
    );
  }

  return (
    <ul className="space-y-2">
      {activities.map((activity) => {
        const target = resolveLearnerActivityTarget({
          activity_id: activity.id,
          type: activity.type,
        });
        const href =
          target?.href ?? LEARNING_LEARNER_ROUTES.activity(activity.id);

        return (
          <li key={activity.id}>
            <Link
              href={href}
              className="watch-focus-ring block rounded-2xl border border-white/10 bg-[#080816]/60 px-4 py-3 transition hover:border-white/25"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-white/90">{activity.name}</p>
                <span className="text-[10px] uppercase tracking-wider text-white/35">
                  {activity.type}
                </span>
              </div>
              {activity.description ? (
                <p className="mt-1 text-sm text-white/50">{activity.description}</p>
              ) : null}
              <p className="mt-2 text-xs text-white/40">
                {activity.hints.is_required
                  ? t("learning.lesson.required")
                  : t("learning.lesson.optional")}
                {activity.hints.max_attempts != null
                  ? ` · ${t("learning.lesson.maxAttempts", {
                      values: { count: activity.hints.max_attempts },
                    })}`
                  : ""}
                {activity.hints.time_limit_seconds != null
                  ? ` · ${t("learning.lesson.timeLimit", {
                      values: { seconds: activity.hints.time_limit_seconds },
                    })}`
                  : ""}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
