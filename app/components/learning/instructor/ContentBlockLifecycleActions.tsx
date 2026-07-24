import type { InstructorContentBlockSummary } from "../../../../lib/learning/instructorAuthoring";
import {
  archiveLearningContentBlockAction,
  publishLearningContentBlockAction,
  unpublishLearningContentBlockAction,
} from "../../../learning/instructor/actions";

export default function ContentBlockLifecycleActions({
  block,
}: {
  block: InstructorContentBlockSummary;
}) {
  return (
    <div className="space-y-3">
      {block.status === "draft" ? (
        <form action={publishLearningContentBlockAction}>
          <input type="hidden" name="blockId" value={block.id} />
          <button
            type="submit"
            className="watch-focus-ring w-full rounded-full bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:bg-white/90"
          >
            Publish block
          </button>
        </form>
      ) : null}

      {block.status === "published" ? (
        <form action={unpublishLearningContentBlockAction}>
          <input type="hidden" name="blockId" value={block.id} />
          <button
            type="submit"
            className="watch-focus-ring w-full rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/[0.07]"
          >
            Unpublish block
          </button>
        </form>
      ) : null}

      {block.status !== "archived" ? (
        <form action={archiveLearningContentBlockAction}>
          <input type="hidden" name="blockId" value={block.id} />
          <button
            type="submit"
            className="watch-focus-ring w-full rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/[0.07]"
          >
            Archive block
          </button>
        </form>
      ) : (
        <p className="text-sm text-white/50">This content block is archived.</p>
      )}
    </div>
  );
}
