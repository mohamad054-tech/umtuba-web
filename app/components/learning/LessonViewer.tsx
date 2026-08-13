import Link from "next/link";
import ContentBlockRenderer from "./ContentBlockRenderer";
import ContinueWatchingVideo from "./ContinueWatchingVideo";
import ActivityList from "./ActivityList";
import {
  asPlainString,
  asVideoProvider,
  isSafeHttpUrl,
} from "../../../lib/learning/contentBlockRender";
import {
  resolveLessonCompletionHandoff,
  LEARNING_LEARNER_ROUTES,
  type LearningLearnerActivitySummary,
  type LearningLearnerLessonDelivery,
} from "../../../lib/learning/learnerDelivery";
import type { LearningLessonContentBlock } from "../../../lib/learning/lessonContentBlocksFoundation";
import type {
  LearningLessonEngineActivity,
  LearningLessonEngineBlock,
  LearningLessonEnginePayload,
} from "../../../lib/learning/lessonEngineFoundation";
import { completeLearningLessonAction } from "../../learning/progressActions";
import { unlockLessonWithUmPointsAction } from "../../learning/firstCourseActions";
import { isAiProductExperienceEnabled } from "../../../lib/ai/betaProductSurfaces";
import {
  learningBtnPrimary,
  learningBtnSecondary,
  learningCard,
  learningCardQuiet,
  learningChip,
  learningEyebrow,
} from "./ui/tokens";

type LessonViewerProps = {
  delivery: LearningLearnerLessonDelivery;
  engine?: LearningLessonEnginePayload | null;
};

function isLessonPointLocked(
  engine: LearningLessonEnginePayload | null
): boolean {
  if (!engine) return false;
  const unlock = engine.unlock;
  if (!unlock || typeof unlock !== "object" || !("locked" in unlock)) {
    return false;
  }
  return (unlock as { locked?: boolean }).locked === true;
}

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

function progressChip(status: string) {
  if (status === "completed") return "Completed";
  if (status === "in_progress") return "In progress";
  return status.replaceAll("_", " ");
}

export default function LessonViewer({
  delivery,
  engine = null,
}: LessonViewerProps) {
  const hasNav = Boolean(delivery.previous_lesson || delivery.next_lesson);
  const locked = isLessonPointLocked(engine);
  const handoff = locked
    ? null
    : resolveLessonCompletionHandoff({
        progress_status: delivery.progress_status,
        next_lesson: delivery.next_lesson,
        course_id: delivery.lesson.course_id,
      });

  const unlock =
    engine &&
    engine.unlock &&
    typeof engine.unlock === "object" &&
    "locked" in engine.unlock
      ? (engine.unlock as {
          locked: boolean;
          cost: number | null;
          balance: number;
          unlocked: boolean;
        })
      : null;

  const resumeSeconds =
    engine?.media_position?.last_media_position_seconds ?? null;
  const resumeBlockId = engine?.media_position?.last_content_block_id ?? null;

  // Prefer engine payload (authoritative unlock redaction). When locked, never
  // fall back to delivery SELECT which bypasses point gates.
  const blocks: LearningLessonContentBlock[] = locked
    ? []
    : engine
      ? toRenderableBlocks(delivery.lesson.id, engine.blocks)
      : delivery.blocks;
  const activities: LearningLearnerActivitySummary[] = locked
    ? []
    : engine
      ? toActivitySummaries(engine.activities)
      : delivery.activities;

  const showAiTutor =
    Boolean(engine?.ai_tutor_enabled) &&
    !locked &&
    isAiProductExperienceEnabled();

  return (
    <div className="mt-2 space-y-6 max-sm:pb-28">
      <header className={`${learningCard} p-4 md:p-6`}>
        <Link
          href={LEARNING_LEARNER_ROUTES.course(delivery.lesson.course_id)}
          className="watch-focus-ring text-xs font-semibold text-white/45 hover:text-white"
        >
          {delivery.lesson.course_name}
        </Link>
        <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">
          {delivery.lesson.name}
        </h1>
        {delivery.lesson.description ? (
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            {delivery.lesson.description}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={learningChip}>
            Progress: {progressChip(delivery.progress_status)}
          </span>
          {engine?.lesson.difficulty ? (
            <span className={learningChip}>{engine.lesson.difficulty}</span>
          ) : null}
          {engine?.lesson.estimated_duration_minutes != null ? (
            <span className={learningChip}>
              ~{engine.lesson.estimated_duration_minutes} min
            </span>
          ) : null}
          {showAiTutor ? (
            <Link
              href={LEARNING_LEARNER_ROUTES.aiTutor(delivery.lesson.id)}
              className="watch-focus-ring inline-flex min-h-8 items-center rounded-full border border-sky-400/30 bg-sky-500/15 px-3 py-1 text-xs font-bold text-sky-100"
            >
              AI Tutor
            </Link>
          ) : null}
        </div>
      </header>

      {engine && engine.objectives.length > 0 ? (
        <section className={`${learningCardQuiet} px-4 py-4`}>
          <h2 className={learningEyebrow}>Learning objectives</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-white/75">
            {engine.objectives.map((o) => (
              <li key={o.id}>{o.objective_text}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {engine && engine.prerequisites.length > 0 ? (
        <section className={`${learningCardQuiet} px-4 py-4`}>
          <h2 className={learningEyebrow}>Prerequisites</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {engine.prerequisites.map((p) => (
              <li key={p.prerequisite_lesson_id} className="text-white/75">
                {p.satisfied ? "✓" : "○"} {p.name}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {unlock && unlock.locked ? (
        <section className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-4">
          <h2 className="text-sm font-bold text-amber-50">Unlock with UM Points</h2>
          <p className="mt-1 text-sm text-amber-50/80">
            Cost: {unlock.cost ?? "—"} · Your balance: {unlock.balance}
          </p>
          <form action={unlockLessonWithUmPointsAction} className="mt-3">
            <input type="hidden" name="lessonId" value={delivery.lesson.id} />
            <button type="submit" className={learningBtnPrimary}>
              Unlock lesson
            </button>
          </form>
        </section>
      ) : null}

      {!locked ? (
        <>
          <section className="space-y-5" aria-label="Lesson content">
            <h2 className="sr-only">Content</h2>
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
                      <div key={block.id} className="-mx-1 sm:mx-0">
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

          {activities.length > 0 ? (
            <section className="space-y-3">
              <h2 className={learningEyebrow}>Activities</h2>
              <ActivityList activities={activities} />
            </section>
          ) : (
            <ActivityList activities={activities} />
          )}
        </>
      ) : (
        <p className="text-sm text-white/55">
          Content and activities stay hidden until this lesson is unlocked.
        </p>
      )}

      {handoff?.kind === "mark_complete" ? (
        <form action={completeLearningLessonAction} className="pt-2 max-sm:hidden">
          <input type="hidden" name="lessonId" value={delivery.lesson.id} />
          <button type="submit" className={learningBtnPrimary}>
            Mark lesson complete
          </button>
        </form>
      ) : null}

      {handoff?.kind === "continue_next" ? (
        <div className="pt-2 max-sm:hidden">
          <Link href={handoff.next_lesson.href} className={learningBtnPrimary}>
            Continue
          </Link>
        </div>
      ) : null}

      {handoff?.kind === "course_complete" ? (
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link href={handoff.course_href} className={learningBtnPrimary}>
            Back to course
          </Link>
          <Link href={handoff.transcript_href} className={learningBtnSecondary}>
            Transcript
          </Link>
        </div>
      ) : null}

      {hasNav ? (
        <nav
          aria-label="Lesson navigation"
          className="hidden items-center justify-between gap-4 border-t border-white/10 pt-4 sm:flex"
        >
          {delivery.previous_lesson ? (
            <Link
              href={delivery.previous_lesson.href}
              className={learningBtnSecondary}
            >
              ← Previous
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}
          {delivery.next_lesson ? (
            <Link href={delivery.next_lesson.href} className={learningBtnSecondary}>
              Next →
            </Link>
          ) : null}
        </nav>
      ) : null}

      <nav
        aria-label="Lesson actions"
        className="fixed inset-x-0 z-40 border-t border-white/10 bg-[#050510]/95 px-3 py-2 backdrop-blur-xl sm:hidden"
        style={{
          bottom: "var(--app-mobile-bottom-nav-offset, 0px)",
        }}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          {delivery.previous_lesson ? (
            <Link
              href={delivery.previous_lesson.href}
              className={`${learningBtnSecondary} flex-1 px-3`}
            >
              ← Previous
            </Link>
          ) : (
            <span className="flex-1" aria-hidden="true" />
          )}
          {handoff?.kind === "mark_complete" ? (
            <form action={completeLearningLessonAction} className="flex-[1.4]">
              <input type="hidden" name="lessonId" value={delivery.lesson.id} />
              <button type="submit" className={`${learningBtnPrimary} w-full px-3`}>
                Mark lesson complete
              </button>
            </form>
          ) : handoff?.kind === "continue_next" ? (
            <Link
              href={handoff.next_lesson.href}
              className={`${learningBtnPrimary} flex-[1.4] px-3`}
            >
              Continue
            </Link>
          ) : delivery.next_lesson ? (
            <Link
              href={delivery.next_lesson.href}
              className={`${learningBtnPrimary} flex-[1.4] px-3`}
            >
              Next →
            </Link>
          ) : (
            <Link
              href={LEARNING_LEARNER_ROUTES.course(delivery.lesson.course_id)}
              className={`${learningBtnPrimary} flex-[1.4] px-3`}
            >
              Back to course
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
