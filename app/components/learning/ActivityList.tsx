import Link from "next/link";
import {
  LEARNING_LEARNER_ROUTES,
  resolveLearnerActivityTarget,
  type LearningLearnerActivitySummary,
} from "../../../lib/learning/learnerDelivery";

type ActivityListProps = {
  activities: LearningLearnerActivitySummary[];
};

export default function ActivityList({ activities }: ActivityListProps) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-white/45">No published activities in this lesson.</p>
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
                {activity.hints.is_required ? "Required" : "Optional"}
                {activity.hints.max_attempts != null
                  ? ` · max ${activity.hints.max_attempts} attempts`
                  : ""}
                {activity.hints.time_limit_seconds != null
                  ? ` · ${activity.hints.time_limit_seconds}s limit`
                  : ""}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
