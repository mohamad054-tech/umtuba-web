import Link from "next/link";
import type { InstructorContentBlockSummary } from "../../../../lib/learning/instructorAuthoring";
import { LEARNING_INSTRUCTOR_ROUTES } from "../../../../lib/learning/instructorAuthoring";
import ContentBlockStatusChip from "./ContentBlockStatusChip";
import { reorderLearningContentBlocksAction } from "../../../learning/instructor/actions";

export default function InstructorContentBlockList({
  lessonId,
  canCreate,
  blocks,
}: {
  lessonId: string;
  canCreate: boolean;
  blocks: InstructorContentBlockSummary[];
}) {
  return (
    <section className="mt-6 border-t border-white/10 pt-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-white/50">
          Content blocks
        </h2>
        {canCreate ? (
          <Link
            href={LEARNING_INSTRUCTOR_ROUTES.contentBlockNew(lessonId)}
            className="watch-focus-ring rounded-full border border-white/15 bg-white px-3 py-1.5 text-xs font-bold text-black"
          >
            New block
          </Link>
        ) : null}
      </div>

      {!canCreate ? (
        <p className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Lesson must be draft or published (and its parent chain valid) before
          creating content blocks.
        </p>
      ) : null}

      {blocks.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5">
          <p className="text-sm text-white/65">No content blocks yet.</p>
          {canCreate ? (
            <Link
              href={LEARNING_INSTRUCTOR_ROUTES.contentBlockNew(lessonId)}
              className="watch-focus-ring mt-3 inline-flex text-sm font-bold text-white/80 hover:text-white"
            >
              Create the first content block →
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {blocks.map((block, index) => {
            const orderedIds = blocks.map((b) => b.id);
            const canMoveUp = index > 0 && block.status !== "archived";
            const canMoveDown =
              index < blocks.length - 1 && block.status !== "archived";
            const moveUpIds = [...orderedIds];
            if (canMoveUp) {
              [moveUpIds[index - 1], moveUpIds[index]] = [
                moveUpIds[index],
                moveUpIds[index - 1],
              ];
            }
            const moveDownIds = [...orderedIds];
            if (canMoveDown) {
              [moveDownIds[index], moveDownIds[index + 1]] = [
                moveDownIds[index + 1],
                moveDownIds[index],
              ];
            }

            return (
              <li key={block.id}>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={LEARNING_INSTRUCTOR_ROUTES.contentBlock(block.id)}
                      className="watch-focus-ring min-w-0 flex-1"
                    >
                      <p className="font-bold text-white">
                        {block.block_type}
                      </p>
                      <p className="mt-0.5 text-xs text-white/50">
                        #{block.position}
                      </p>
                    </Link>
                    <ContentBlockStatusChip status={block.status} />
                  </div>
                  {(canMoveUp || canMoveDown) &&
                  blocks.every(
                    (b) => b.status === "draft" || b.status === "published"
                  ) ? (
                    <div className="mt-3 flex gap-2">
                      {canMoveUp ? (
                        <form action={reorderLearningContentBlocksAction}>
                          <input type="hidden" name="lessonId" value={lessonId} />
                          <input
                            type="hidden"
                            name="blockIds"
                            value={moveUpIds.join(",")}
                          />
                          <button
                            type="submit"
                            className="watch-focus-ring rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-white/70 hover:bg-white/[0.05]"
                          >
                            Move up
                          </button>
                        </form>
                      ) : null}
                      {canMoveDown ? (
                        <form action={reorderLearningContentBlocksAction}>
                          <input type="hidden" name="lessonId" value={lessonId} />
                          <input
                            type="hidden"
                            name="blockIds"
                            value={moveDownIds.join(",")}
                          />
                          <button
                            type="submit"
                            className="watch-focus-ring rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-white/70 hover:bg-white/[0.05]"
                          >
                            Move down
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
