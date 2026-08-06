import Link from "next/link";
import ContentBlockRenderer from "./ContentBlockRenderer";
import ContinueWatchingVideo from "./ContinueWatchingVideo";
import ActivityList from "./ActivityList";
import LessonNotesPanel from "./LessonNotesPanel";
import {
  asPlainString,
  asVideoProvider,
  isSafeHttpUrl,
} from "../../../lib/learning/contentBlockRender";
import {
  resolveLessonCompletionHandoff,
  LEARNING_LEARNER_ROUTES,
  type LearningLearnerActivitySummary,
  type LearningLearnerLessonShell,
} from "../../../lib/learning/learnerDelivery";
import type { LearningLessonContentBlock } from "../../../lib/learning/lessonContentBlocksFoundation";
import type {
  LearningLessonContentAccess,
  LearningLessonEngineActivity,
  LearningLessonEngineBlock,
  LearningLessonEnginePayload,
} from "../../../lib/learning/lessonEngineFoundation";
import {
  LEARNING_LESSON_ACCESS_UNVERIFIED_MESSAGE,
  LEARNING_LESSON_LOCKED_MESSAGE,
  resolveLessonContentAccess,
} from "../../../lib/learning/lessonEngineFoundation";
import { completeLearningLessonAction } from "../../learning/progressActions";
import { unlockLessonWithUmPointsAction } from "../../learning/firstCourseActions";

type LessonViewerProps = {
  /**
   * Shell / delivery metadata only. Protected content always comes from
   * `access` (verified engine) — never from a delivery SELECT payload.
   */
  delivery: LearningLearnerLessonShell;
  /**
   * Prefer passing the full engine result so missing/failed engine never
   * falls open to delivery SELECT content.
   */
  access?: LearningLessonContentAccess;
  /** @deprecated Prefer `access` from resolveLessonContentAccess. */
  engine?: LearningLessonEnginePayload | null;
};

function toRenderableBlocks(
  lessonId: string,
  blocks: LearningLessonEngineBlock[]
): LearningLessonContentBlock[] {
  return blocks.map((block) => ({
    id: block.id,
    lesson_id: lessonId,
    block_type: block.block_type as LearningLessonContentBlock["block_type"],
    status: block.status as LearningLessonContentBlock["status"],
    position: block.position,
    content: block.content ?? {},
    created_by: "",
    updated_by: null,
    created_at: "",
    updated_at: "",
    published_at: null,
    suspended_at: null,
    archived_at: null,
  }));
}

function toActivitySummaries(
  activities: LearningLessonEngineActivity[]
): LearningLearnerActivitySummary[] {
  return activities.map((activity, index) => ({
    id: activity.id,
    name: activity.name,
    slug: activity.id,
    type: activity.type,
    description: null,
    position: index,
    hints: {
      is_required: true,
      max_attempts: null,
      time_limit_seconds: null,
    },
  }));
}

export default function LessonViewer({
  delivery,
  access: accessProp,
  engine = null,
}: LessonViewerProps) {
  const access =
    accessProp ??
    resolveLessonContentAccess(
      engine
        ? { ok: true, data: engine }
        : {
            ok: false,
            message: LEARNING_LESSON_ACCESS_UNVERIFIED_MESSAGE,
          }
    );

  const canRender = access.canRenderProtectedContent;
  const locked = access.state === "locked";
  const verificationFailed =
    access.state === "engine_unavailable" ||
    access.state === "access_unverified";
  const enginePayload =
    access.state === "verified_unlocked" || access.state === "locked"
      ? access.engine
      : null;
  const verifiedEngine =
    access.state === "verified_unlocked" ? access.engine : null;

  const hasNav = Boolean(delivery.previous_lesson || delivery.next_lesson);
  const handoff = canRender
    ? resolveLessonCompletionHandoff({
        progress_status: delivery.progress_status,
        next_lesson: delivery.next_lesson,
        course_id: delivery.lesson.course_id,
      })
    : null;

  const unlock = access.unlock;

  const resumeSeconds =
    verifiedEngine?.media_position?.last_media_position_seconds ?? null;
  const resumeBlockId =
    verifiedEngine?.media_position?.last_content_block_id ?? null;

  // Protected content only from a positively verified engine payload.
  // Never fall back to delivery SELECT blocks/activities (fail-open path).
  const blocks: LearningLessonContentBlock[] = verifiedEngine
    ? toRenderableBlocks(delivery.lesson.id, verifiedEngine.blocks)
    : [];
  const activities: LearningLearnerActivitySummary[] = verifiedEngine
    ? toActivitySummaries(verifiedEngine.activities)
    : [];

  const gateMessage = locked
    ? access.message || LEARNING_LESSON_LOCKED_MESSAGE
    : verificationFailed
      ? access.message || LEARNING_LESSON_ACCESS_UNVERIFIED_MESSAGE
      : null;

  return (
    <div className="mt-6 space-y-6" data-testid="learning-lesson-viewer">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          {delivery.lesson.course_name}
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">
          {delivery.lesson.name}
        </h1>
        {delivery.lesson.description ? (
          <p className="mt-2 text-sm text-white/50">{delivery.lesson.description}</p>
        ) : null}
        <p className="mt-3 text-xs text-white/40">
          Progress: {delivery.progress_status.replaceAll("_", " ")}
          {enginePayload?.lesson.difficulty
            ? ` · ${enginePayload.lesson.difficulty}`
            : ""}
          {enginePayload?.lesson.estimated_duration_minutes != null
            ? ` · ~${enginePayload.lesson.estimated_duration_minutes} min`
            : ""}
        </p>
        {enginePayload?.ai_tutor_enabled && canRender ? (
          <p className="mt-3">
            <Link
              href={LEARNING_LEARNER_ROUTES.aiTutor(delivery.lesson.id)}
              className="text-sm font-bold text-sky-300 underline underline-offset-2"
            >
              AI Tutor
            </Link>
          </p>
        ) : null}
      </section>

      {enginePayload && enginePayload.objectives.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            Learning objectives
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-white/75">
            {enginePayload.objectives.map((o) => (
              <li key={o.id}>{o.objective_text}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {enginePayload && enginePayload.prerequisites.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            Prerequisites
          </h2>
          <ul className="space-y-1 text-sm">
            {enginePayload.prerequisites.map((p) => (
              <li key={p.prerequisite_lesson_id} className="text-white/75">
                {p.satisfied ? "✓" : "○"} {p.name}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {locked && unlock ? (
        <section className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-4">
          <h2 className="text-sm font-bold text-amber-50">Unlock with UM Points</h2>
          <p className="mt-1 text-sm text-amber-50/80">
            Cost: {unlock.cost ?? "—"} · Your balance: {unlock.balance}
          </p>
          <form action={unlockLessonWithUmPointsAction} className="mt-3">
            <input type="hidden" name="lessonId" value={delivery.lesson.id} />
            <button
              type="submit"
              className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
            >
              Unlock lesson
            </button>
          </form>
        </section>
      ) : null}

      {verificationFailed ? (
        <p
          role="alert"
          className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {gateMessage}
        </p>
      ) : null}

      {canRender ? (
        <>
          <section className="space-y-4" data-testid="learning-lesson-content">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
              Content
            </h2>
            {blocks.length === 0 ? (
              <p className="text-sm text-white/45">No published content blocks.</p>
            ) : (
              blocks.map((block) => {
                if (block.block_type === "video" && block.status === "published") {
                  const url = block.content?.url;
                  if (isSafeHttpUrl(url)) {
                    const useResume =
                      resumeBlockId === block.id ||
                      (!resumeBlockId &&
                        blocks.find((b) => b.block_type === "video")?.id ===
                          block.id);
                    return (
                      <div key={block.id}>
                        <ContinueWatchingVideo
                          src={url}
                          lessonId={delivery.lesson.id}
                          contentBlockId={block.id}
                          initialSeconds={useResume ? resumeSeconds : null}
                          caption={asPlainString(block.content?.caption, 1000)}
                          provider={asVideoProvider(block.content?.provider)}
                        />
                      </div>
                    );
                  }
                }
                return (
                  <div key={block.id}>
                    <ContentBlockRenderer block={block} />
                  </div>
                );
              })
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
              Activities
            </h2>
            <ActivityList activities={activities} />
          </section>

          <LessonNotesPanel lessonId={delivery.lesson.id} />
        </>
      ) : locked ? (
        <p
          className="text-sm text-white/55"
          data-testid="learning-lesson-locked"
          role="status"
        >
          {gateMessage}
        </p>
      ) : null}

      {handoff?.kind === "mark_complete" ? (
        <form action={completeLearningLessonAction} className="pt-2">
          <input type="hidden" name="lessonId" value={delivery.lesson.id} />
          <button
            type="submit"
            className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
          >
            Mark lesson complete
          </button>
        </form>
      ) : null}

      {handoff?.kind === "continue_next" ? (
        <div className="pt-2">
          <Link
            href={handoff.next_lesson.href}
            className="watch-focus-ring inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
          >
            Continue
          </Link>
        </div>
      ) : null}

      {handoff?.kind === "course_complete" ? (
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href={handoff.course_href}
            className="watch-focus-ring inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
          >
            Back to course
          </Link>
          <Link
            href={handoff.transcript_href}
            className="watch-focus-ring inline-flex rounded-full border border-white/20 bg-transparent px-5 py-2.5 text-sm font-bold text-white"
          >
            Transcript
          </Link>
        </div>
      ) : null}

      {hasNav ? (
        <nav
          aria-label="Lesson navigation"
          className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4"
          data-testid="learning-lesson-nav"
        >
          {delivery.previous_lesson ? (
            <Link
              href={delivery.previous_lesson.href}
              className="watch-focus-ring text-sm font-bold text-white/60 hover:text-white"
              data-testid="learning-lesson-nav-prev"
            >
              ← Previous
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}
          {delivery.next_lesson ? (
            <Link
              href={delivery.next_lesson.href}
              className="watch-focus-ring text-sm font-bold text-white/60 hover:text-white"
              data-testid="learning-lesson-nav-next"
            >
              Next →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
