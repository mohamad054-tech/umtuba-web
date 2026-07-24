import {
  LEARNING_ACTIVITY_COMPLETION_MODES,
  LEARNING_ACTIVITY_VISIBILITIES,
} from "../../../../lib/learning/activitiesFoundation";
import type { InstructorActivitySummary } from "../../../../lib/learning/instructorAuthoring";
import {
  updateLearningActivityAction,
  updateLearningActivitySettingsAction,
} from "../../../learning/instructor/actions";

export default function UpdateActivityForm({
  activity,
  errorMessage,
}: {
  activity: InstructorActivitySummary;
  errorMessage?: string | null;
}) {
  const configDefault = JSON.stringify(activity.config ?? {}, null, 2);

  return (
    <div className="space-y-8">
      {errorMessage ? (
        <p
          role="alert"
          className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {errorMessage}
        </p>
      ) : null}

      <form action={updateLearningActivityAction} className="space-y-4">
        <input type="hidden" name="activityId" value={activity.id} />
        <h3 className="text-sm font-bold uppercase tracking-wide text-white/50">
          Details
        </h3>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-white/50">
            Name
          </span>
          <input
            name="name"
            required
            maxLength={160}
            defaultValue={activity.name}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none focus:border-white/25"
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-white/50">
            Description
          </span>
          <textarea
            name="description"
            rows={3}
            maxLength={8000}
            defaultValue={activity.description ?? ""}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none focus:border-white/25"
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-white/50">
            Visibility
          </span>
          <select
            name="visibility"
            defaultValue={activity.visibility}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0a0a14] px-3 py-2.5 text-sm text-white outline-none focus:border-white/25"
          >
            {LEARNING_ACTIVITY_VISIBILITIES.map((visibility) => (
              <option key={visibility} value={visibility}>
                {visibility}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="watch-focus-ring w-full rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white/90 transition hover:bg-white/[0.07]"
        >
          Save details
        </button>
      </form>

      <form action={updateLearningActivitySettingsAction} className="space-y-4">
        <input type="hidden" name="activityId" value={activity.id} />
        <h3 className="text-sm font-bold uppercase tracking-wide text-white/50">
          Settings
        </h3>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-white/50">
            Completion mode
          </span>
          <select
            name="completionMode"
            defaultValue={activity.completion_mode}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0a0a14] px-3 py-2.5 text-sm text-white outline-none focus:border-white/25"
          >
            {LEARNING_ACTIVITY_COMPLETION_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-white/50">
            Config (JSON object)
          </span>
          <textarea
            name="config"
            rows={5}
            defaultValue={configDefault}
            spellCheck={false}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 font-mono text-xs text-white outline-none focus:border-white/25"
          />
        </label>

        <button
          type="submit"
          className="watch-focus-ring w-full rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white/90 transition hover:bg-white/[0.07]"
        >
          Save settings
        </button>
      </form>
    </div>
  );
}
