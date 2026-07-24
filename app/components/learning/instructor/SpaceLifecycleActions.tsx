import type { InstructorSpaceSummary } from "../../../../lib/learning/instructorAuthoring";
import {
  archiveLearningSpaceAction,
  publishLearningSpaceAction,
} from "../../../learning/instructor/actions";

export default function SpaceLifecycleActions({
  space,
  errorMessage,
}: {
  space: InstructorSpaceSummary;
  errorMessage?: string | null;
}) {
  return (
    <div className="space-y-3">
      {errorMessage ? (
        <p
          role="alert"
          className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {errorMessage}
        </p>
      ) : null}

      {space.status === "draft" ? (
        <form action={publishLearningSpaceAction}>
          <input type="hidden" name="spaceId" value={space.id} />
          <button
            type="submit"
            className="watch-focus-ring w-full rounded-full bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:bg-white/90"
          >
            Publish space
          </button>
          <p className="mt-2 text-xs text-white/45">
            Publishing sets status to active. Programs can only be created under
            an active space.
          </p>
        </form>
      ) : null}

      {space.status !== "archived" ? (
        <form action={archiveLearningSpaceAction}>
          <input type="hidden" name="spaceId" value={space.id} />
          <button
            type="submit"
            className="watch-focus-ring w-full rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/[0.07]"
          >
            Archive space
          </button>
        </form>
      ) : (
        <p className="text-sm text-white/50">This space is archived.</p>
      )}
    </div>
  );
}
