import type { InstructorSectionSummary } from "../../../../lib/learning/instructorAuthoring";
import {
  archiveLearningSectionAction,
  publishLearningSectionAction,
} from "../../../learning/instructor/actions";

export default function SectionLifecycleActions({
  section,
  errorMessage,
}: {
  section: InstructorSectionSummary;
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

      {section.status === "draft" ? (
        <form action={publishLearningSectionAction}>
          <input type="hidden" name="sectionId" value={section.id} />
          <button
            type="submit"
            className="watch-focus-ring w-full rounded-full bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:bg-white/90"
          >
            Publish section
          </button>
        </form>
      ) : null}

      {section.status !== "archived" ? (
        <form action={archiveLearningSectionAction}>
          <input type="hidden" name="sectionId" value={section.id} />
          <button
            type="submit"
            className="watch-focus-ring w-full rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/[0.07]"
          >
            Archive section
          </button>
        </form>
      ) : (
        <p className="text-sm text-white/50">This section is archived.</p>
      )}
    </div>
  );
}
