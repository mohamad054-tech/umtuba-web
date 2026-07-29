import type { AiHubActivityItem } from "../../../lib/ai/hub/types";

type Props = {
  activity: AiHubActivityItem[];
};

export default function AiRecentActivitySection({ activity }: Props) {
  return (
    <section aria-labelledby="ai-activity-heading" className="mt-8">
      <h2
        id="ai-activity-heading"
        className="font-serif text-xl text-[#f3faf5]"
      >
        Recent activity
      </h2>
      <p className="mt-1 text-sm text-emerald-100/65">
        From AI Hub activity contracts (foundation store).
      </p>
      {activity.length === 0 ? (
        <p className="mt-3 text-sm text-emerald-100/50">No recent activity.</p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {activity.map((item) => (
            <li
              key={item.activityId}
              className="rounded-md border border-emerald-900/50 bg-[#101a16] px-3 py-2"
            >
              <p className="text-sm font-semibold text-emerald-50">{item.title}</p>
              <p className="mt-1 text-xs text-emerald-100/55">
                {item.kind}
                {item.moduleId ? ` · ${item.moduleId}` : ""} ·{" "}
                {new Date(item.occurredAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
