import { notFound, redirect } from "next/navigation";
import InstructorShell from "../../../../components/learning/instructor/InstructorShell";
import ContentBlockLifecycleActions from "../../../../components/learning/instructor/ContentBlockLifecycleActions";
import ContentBlockStatusChip from "../../../../components/learning/instructor/ContentBlockStatusChip";
import { EditContentBlockForm } from "../../../../components/learning/instructor/ContentBlockFields";
import { updateLearningContentBlockAction } from "../../actions";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_ROUTES,
  getInstructorContentBlock,
  getInstructorLesson,
} from "../../../../../lib/learning/instructorAuthoring";
import {
  LEARNING_LESSON_CONTENT_BLOCK_CREATABLE_TYPES,
  type LearningLessonContentBlockCreatableType,
} from "../../../../../lib/learning/lessonContentBlocksFoundation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ blockId: string }> | { blockId: string };
  searchParams?:
    | Promise<{ error?: string; notice?: string }>
    | { error?: string; notice?: string };
};

export async function generateMetadata({ params }: PageProps) {
  const { blockId } = await Promise.resolve(params);
  void blockId;
  return { title: "Content block · Instructor | UM Learning" };
}

function isCreatable(
  value: string
): value is LearningLessonContentBlockCreatableType {
  return (
    LEARNING_LESSON_CONTENT_BLOCK_CREATABLE_TYPES as readonly string[]
  ).includes(value);
}

export default async function InstructorContentBlockPage({
  params,
  searchParams,
}: PageProps) {
  const { blockId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_INSTRUCTOR_ROUTES.contentBlock(blockId)
      )}`
    );
  }

  const supabase = await createClient();
  const block = await getInstructorContentBlock(supabase, blockId);
  if (!block.ok) {
    if (block.message.toLowerCase().includes("not found")) notFound();
    return (
      <InstructorShell
        title="Content block"
        backHref={LEARNING_INSTRUCTOR_ROUTES.hub}
        backLabel="Spaces"
      >
        <p
          role="alert"
          className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {block.message}
        </p>
      </InstructorShell>
    );
  }

  const lesson = await getInstructorLesson(supabase, block.data.lesson_id);
  const backHref = lesson.ok
    ? LEARNING_INSTRUCTOR_ROUTES.lesson(lesson.data.id)
    : LEARNING_INSTRUCTOR_ROUTES.hub;
  const backLabel = lesson.ok ? lesson.data.name : "Lessons";
  const creatableType = isCreatable(block.data.block_type)
    ? block.data.block_type
    : null;

  return (
    <InstructorShell
      title={block.data.block_type}
      subtitle="Lesson content block"
      backHref={backHref}
      backLabel={backLabel}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {block.data.block_type}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            #{block.data.position}
          </p>
        </div>
        <ContentBlockStatusChip status={block.data.status} />
      </div>

      {query.notice?.trim() ? (
        <p
          role="status"
          className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
        >
          {query.notice.trim()}
        </p>
      ) : null}

      {query.error?.trim() ? (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {query.error.trim()}
        </p>
      ) : null}

      <div className="mt-6 border-t border-white/10 pt-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/50">
          Lifecycle
        </h2>
        <ContentBlockLifecycleActions block={block.data} />
      </div>

      <div className="mt-6 border-t border-white/10 pt-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/50">
          Content
        </h2>
        {creatableType &&
        (block.data.status === "draft" || block.data.status === "published") ? (
          <EditContentBlockForm
            blockId={block.data.id}
            blockType={creatableType}
            content={block.data.content}
            action={updateLearningContentBlockAction}
          />
        ) : (
          <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-white/70">
            {JSON.stringify(block.data.content, null, 2)}
          </pre>
        )}
      </div>
    </InstructorShell>
  );
}
