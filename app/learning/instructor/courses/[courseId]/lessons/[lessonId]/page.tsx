import { redirect } from "next/navigation";
import LearningShell from "../../../../../../components/learning/LearningShell";
import InstructorActionForm from "../../../../../../components/learning/instructor/InstructorActionForm";
import { createClient, getServerUser } from "../../../../../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_ROUTES,
  loadInstructorLessonBlocks,
} from "../../../../../../../lib/learning/instructorAuthoring";
import {
  archiveContentBlockAction,
  createContentBlockAction,
  publishContentBlockAction,
  reorderContentBlocksAction,
  unpublishContentBlockAction,
  updateContentBlockAction,
} from "../../../../actions";

type PageProps = {
  params: Promise<{ courseId: string; lessonId: string }>;
};

type BlockRow = {
  id: string;
  block_type: string;
  status: string;
  position: number;
  content: Record<string, unknown> | null;
};

export default async function InstructorLessonBlocksPage({ params }: PageProps) {
  const { courseId, lessonId } = await params;
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_INSTRUCTOR_ROUTES.lesson(courseId, lessonId)
      )}`
    );
  }

  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("learning_lessons")
    .select("id, name, status, section_id")
    .eq("id", lessonId)
    .maybeSingle();

  const blocksResult = await loadInstructorLessonBlocks(supabase, lessonId);
  if (!lesson || !blocksResult.ok) {
    return (
      <LearningShell
        title="Lesson unavailable"
        backHref={LEARNING_INSTRUCTOR_ROUTES.course(courseId)}
        backLabel="Back to course"
      >
        <p className="mt-6 rounded-lg border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100">
          {!lesson
            ? "Lesson not found or unavailable."
            : blocksResult.ok
              ? "Unavailable."
              : blocksResult.message}
        </p>
      </LearningShell>
    );
  }

  const blocks = blocksResult.data as BlockRow[];
  const blockIdsOrdered = blocks.map((b) => b.id).join(",");

  return (
    <LearningShell
      title={lesson.name}
      subtitle={`Content blocks · ${lesson.status}`}
      backHref={LEARNING_INSTRUCTOR_ROUTES.course(courseId)}
      backLabel="Back to course"
    >
      <p className="mt-3 text-sm text-white/60">
        Basic text/heading blocks only in this minimal slice. Media pipelines and
        questions remain out of scope.
      </p>

      <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-base font-bold">Add content block</h2>
        <InstructorActionForm
          action={createContentBlockAction}
          className="mt-3 space-y-2"
          successMessage="Block created."
        >
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="lessonId" value={lessonId} />
          <select
            name="blockType"
            defaultValue="rich_text"
            className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm"
          >
            <option value="rich_text">rich_text</option>
            <option value="heading">heading</option>
            <option value="callout">callout</option>
          </select>
          <textarea
            name="text"
            required
            placeholder="Block text"
            className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm"
            rows={3}
          />
        </InstructorActionForm>
      </section>

      {blocks.length > 1 ? (
        <section className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="text-base font-bold">Reorder blocks</h2>
          <InstructorActionForm
            action={reorderContentBlocksAction}
            className="mt-3 space-y-2"
            successMessage="Blocks reordered."
          >
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="lessonId" value={lessonId} />
            <textarea
              name="blockIds"
              required
              defaultValue={blockIdsOrdered}
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-mono text-xs"
              rows={3}
            />
          </InstructorActionForm>
        </section>
      ) : null}

      <ul className="mt-6 space-y-4">
        {blocks.length === 0 ? (
          <li className="text-sm text-white/60">No content blocks yet.</li>
        ) : (
          blocks.map((block) => {
            const text =
              typeof block.content?.text === "string" ? block.content.text : "";
            return (
              <li
                key={block.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-bold">
                    {block.block_type}{" "}
                    <span className="font-normal text-white/50">
                      · pos {block.position}
                    </span>
                  </p>
                  <span className="text-xs uppercase text-white/50">
                    {block.status}
                  </span>
                </div>

                <InstructorActionForm
                  action={updateContentBlockAction}
                  className="mt-3 space-y-2"
                  successMessage="Block updated."
                >
                  <input type="hidden" name="courseId" value={courseId} />
                  <input type="hidden" name="lessonId" value={lessonId} />
                  <input type="hidden" name="blockId" value={block.id} />
                  <textarea
                    name="text"
                    defaultValue={text}
                    className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm"
                    rows={3}
                  />
                </InstructorActionForm>

                <div className="mt-2 flex flex-wrap gap-2">
                  <InstructorActionForm
                    action={publishContentBlockAction}
                    successMessage="Block published."
                  >
                    <input type="hidden" name="courseId" value={courseId} />
                    <input type="hidden" name="lessonId" value={lessonId} />
                    <input type="hidden" name="blockId" value={block.id} />
                  </InstructorActionForm>
                  <InstructorActionForm
                    action={unpublishContentBlockAction}
                    successMessage="Block unpublished."
                  >
                    <input type="hidden" name="courseId" value={courseId} />
                    <input type="hidden" name="lessonId" value={lessonId} />
                    <input type="hidden" name="blockId" value={block.id} />
                  </InstructorActionForm>
                  <InstructorActionForm
                    action={archiveContentBlockAction}
                    successMessage="Block archived."
                  >
                    <input type="hidden" name="courseId" value={courseId} />
                    <input type="hidden" name="lessonId" value={lessonId} />
                    <input type="hidden" name="blockId" value={block.id} />
                  </InstructorActionForm>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </LearningShell>
  );
}
