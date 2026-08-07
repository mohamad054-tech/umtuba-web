import { redirect } from "next/navigation";
import LearningShell from "../../../../../../components/learning/LearningShell";
import InstructorActionForm from "../../../../../../components/learning/instructor/InstructorActionForm";
import InstructorContentBlockCreateForm from "../../../../../../components/learning/instructor/InstructorContentBlockCreateForm";
import { createClient, getServerUser } from "../../../../../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_ROUTES,
  loadInstructorLessonBlocks,
  type InstructorLessonBlocksPayload,
} from "../../../../../../../lib/learning/instructorAuthoring";
import { loadLessonPointCostConfig } from "../../../../../../../lib/learning/lessonUnlockFoundation";
import {
  isInstructorContentBlockAuthoringType,
  summarizeInstructorContentBlock,
} from "../../../../../../../lib/learning/instructorContentBlockAuthoring";
import {
  archiveContentBlockAction,
  publishContentBlockAction,
  reorderContentBlocksAction,
  setLessonPointCostAction,
  unpublishContentBlockAction,
  updateContentBlockAction,
} from "../../../../actions";

type PageProps = {
  params: Promise<{ courseId: string; lessonId: string }>;
};

const fieldClass =
  "w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function BlockEditFields({
  blockType,
  content,
}: {
  blockType: string;
  content: Record<string, unknown>;
}) {
  if (!isInstructorContentBlockAuthoringType(blockType)) {
    return (
      <p className="text-sm text-white/50">
        This block type cannot be edited in the instructor UI yet.
      </p>
    );
  }

  switch (blockType) {
    case "rich_text":
    case "heading":
    case "callout":
      return (
        <>
          <textarea
            name="text"
            required
            aria-label="Update block text"
            defaultValue={asString(content.text)}
            className={fieldClass}
            rows={3}
          />
          {blockType === "callout" ? (
            <select
              name="variant"
              aria-label="Callout variant"
              defaultValue={asString(content.variant) || "info"}
              className={fieldClass}
            >
              <option value="info">info</option>
              <option value="note">note</option>
              <option value="tip">tip</option>
              <option value="success">success</option>
              <option value="warning">warning</option>
              <option value="danger">danger</option>
            </select>
          ) : null}
        </>
      );
    case "quote":
      return (
        <>
          <textarea
            name="text"
            required
            aria-label="Quote text"
            defaultValue={asString(content.text)}
            className={fieldClass}
            rows={3}
          />
          <input
            type="text"
            name="attribution"
            aria-label="Attribution"
            defaultValue={asString(content.attribution)}
            className={fieldClass}
          />
        </>
      );
    case "image":
      return (
        <>
          <input
            type="url"
            name="url"
            required
            aria-label="Image URL"
            defaultValue={asString(content.url)}
            className={fieldClass}
          />
          <input
            type="text"
            name="alt"
            aria-label="Alt text"
            defaultValue={asString(content.alt)}
            className={fieldClass}
          />
          <input
            type="text"
            name="caption"
            aria-label="Caption"
            defaultValue={asString(content.caption)}
            className={fieldClass}
          />
        </>
      );
    case "video":
      return (
        <>
          <input
            type="url"
            name="url"
            required
            aria-label="Video URL"
            defaultValue={asString(content.url)}
            className={fieldClass}
          />
          <select
            name="provider"
            aria-label="Video provider"
            defaultValue={asString(content.provider)}
            className={fieldClass}
          >
            <option value="">Provider (optional)</option>
            <option value="file">file</option>
            <option value="url">url</option>
            <option value="youtube">youtube</option>
            <option value="vimeo">vimeo</option>
          </select>
          <input
            type="text"
            name="caption"
            aria-label="Caption"
            defaultValue={asString(content.caption)}
            className={fieldClass}
          />
        </>
      );
    case "audio":
      return (
        <>
          <input
            type="url"
            name="url"
            required
            aria-label="Audio URL"
            defaultValue={asString(content.url)}
            className={fieldClass}
          />
          <input
            type="text"
            name="caption"
            aria-label="Caption"
            defaultValue={asString(content.caption)}
            className={fieldClass}
          />
        </>
      );
    case "divider":
      return (
        <select
          name="style"
          aria-label="Divider style"
          defaultValue={asString(content.style) || "solid"}
          className={fieldClass}
        >
          <option value="solid">solid</option>
          <option value="dashed">dashed</option>
          <option value="dotted">dotted</option>
        </select>
      );
    case "external_link":
      return (
        <>
          <input
            type="url"
            name="url"
            required
            aria-label="Link URL"
            defaultValue={asString(content.url)}
            className={fieldClass}
          />
          <input
            type="text"
            name="label"
            aria-label="Label"
            defaultValue={asString(content.label)}
            className={fieldClass}
          />
          <input
            type="text"
            name="description"
            aria-label="Description"
            defaultValue={asString(content.description)}
            className={fieldClass}
          />
        </>
      );
    case "code_block":
      return (
        <>
          <textarea
            name="code"
            required
            aria-label="Code"
            defaultValue={asString(content.code)}
            className={`${fieldClass} font-mono text-xs`}
            rows={6}
          />
          <input
            type="text"
            name="language"
            aria-label="Language"
            defaultValue={asString(content.language)}
            className={fieldClass}
          />
        </>
      );
    default:
      return null;
  }
}

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
  const [blocksResult, pointCostResult] = await Promise.all([
    loadInstructorLessonBlocks(supabase, lessonId),
    loadLessonPointCostConfig(supabase, lessonId),
  ]);
  if (!blocksResult.ok) {
    return (
      <LearningShell
        title="Lesson unavailable"
        backHref={LEARNING_INSTRUCTOR_ROUTES.course(courseId)}
        backLabel="Back to course"
      >
        <p className="mt-6 rounded-lg border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100">
          {blocksResult.message}
        </p>
      </LearningShell>
    );
  }

  const payload = blocksResult.data as InstructorLessonBlocksPayload;
  const { lesson, blocks } = payload;
  if (lesson.course_id !== courseId) {
    redirect(LEARNING_INSTRUCTOR_ROUTES.course(courseId));
  }

  const pointCost = pointCostResult.ok ? pointCostResult.data : null;
  const paidEnabled = pointCost?.enabled === true;
  const storedCost = pointCost?.unlock_cost ?? null;
  const defaultCost = storedCost != null ? String(storedCost) : "50";

  const blockIdsOrdered = blocks.map((b) => b.id).join(",");

  return (
    <LearningShell
      title={lesson.name}
      subtitle={`Content blocks · ${lesson.status}`}
      backHref={LEARNING_INSTRUCTOR_ROUTES.course(courseId)}
      backLabel="Back to course"
    >
      <p className="mt-3 text-sm text-white/60">
        Author text, media URL references, links, quotes, dividers, and code
        blocks. Uploads and AI/interactive blocks remain out of scope.
      </p>

      <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-base font-bold">UM Points unlock</h2>
        <p className="mt-1 text-sm text-white/55">
          {paidEnabled && storedCost != null
            ? `Paid unlock enabled · cost ${storedCost} UM Points.`
            : pointCost && !paidEnabled
              ? `Free for learners · paid unlock disabled (saved cost ${storedCost}).`
              : "Free for learners · no point cost configured."}
        </p>
        {!pointCostResult.ok ? (
          <p className="mt-2 text-sm text-amber-200" role="status">
            Point cost status could not be loaded. You can still try saving a
            cost.
          </p>
        ) : null}

        <InstructorActionForm
          action={setLessonPointCostAction}
          className="mt-3 space-y-2"
          successMessage={
            paidEnabled ? "Point cost updated." : "Paid unlock enabled."
          }
          submitLabel={paidEnabled ? "Update cost" : "Enable paid unlock"}
          refreshOnSuccess
        >
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="lessonId" value={lessonId} />
          <input
            type="hidden"
            name="mode"
            value={paidEnabled ? "update" : "enable"}
          />
          <label className="block text-xs font-bold uppercase tracking-wider text-white/45">
            Unlock cost (UM Points)
            <input
              type="number"
              name="unlockCost"
              min={1}
              step={1}
              required
              defaultValue={defaultCost}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm font-normal normal-case tracking-normal text-white"
            />
          </label>
        </InstructorActionForm>

        {paidEnabled && storedCost != null ? (
          <InstructorActionForm
            action={setLessonPointCostAction}
            className="mt-3"
            successMessage="Paid unlock disabled. Lesson is free for entitled learners."
            submitLabel="Disable paid unlock"
            refreshOnSuccess
          >
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="lessonId" value={lessonId} />
            <input type="hidden" name="mode" value="disable" />
            <input type="hidden" name="unlockCost" value={String(storedCost)} />
          </InstructorActionForm>
        ) : null}
      </section>

      <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-base font-bold">Add content block</h2>
        <InstructorContentBlockCreateForm
          courseId={courseId}
          lessonId={lessonId}
        />
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
              aria-label="Ordered content block ids"
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
            const content =
              block.content && typeof block.content === "object"
                ? (block.content as Record<string, unknown>)
                : {};
            const summary = summarizeInstructorContentBlock({
              block_type: block.block_type,
              content,
            });
            return (
              <li
                key={block.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                data-testid="instructor-content-block-item"
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
                <p className="mt-2 whitespace-pre-wrap text-sm text-white/65">
                  {summary}
                </p>

                <InstructorActionForm
                  action={updateContentBlockAction}
                  className="mt-3 space-y-2"
                  successMessage="Block updated."
                >
                  <input type="hidden" name="courseId" value={courseId} />
                  <input type="hidden" name="lessonId" value={lessonId} />
                  <input type="hidden" name="blockId" value={block.id} />
                  <input type="hidden" name="blockType" value={block.block_type} />
                  <BlockEditFields
                    blockType={block.block_type}
                    content={content}
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
