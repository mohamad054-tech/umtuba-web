import Link from "next/link";
import ContentBlockRenderer from "./ContentBlockRenderer";
import ContinueWatchingVideo from "./ContinueWatchingVideo";
import LessonNotesPanel from "./LessonNotesPanel";
import LessonBookmarkControl from "./LessonBookmarkControl";
import {
  asPlainString,
  asVideoProvider,
  isSafeHttpUrl,
} from "../../../lib/learning/contentBlockRender";
import {
  partitionLessonExperienceBlocks,
  resolveLessonLabCards,
  resolveLessonQuizCtas,
  resolveLessonVideoSlot,
} from "../../../lib/learning/lessonExperienceLayout";
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
  /** Initial bookmark state for verified canRender lessons only. */
  initialBookmarkSaved?: boolean;
  /** Published question counts by quiz activity id (count-only). */
  questionCountByActivityId?: Readonly<Record<string, number>>;
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

function BlockStack({
  blocks,
  resumeSeconds,
  resumeBlockId,
  lessonId,
}: {
  blocks: LearningLessonContentBlock[];
  resumeSeconds: number | null;
  resumeBlockId: string | null;
  lessonId: string;
}) {
  if (blocks.length === 0) return null;
  const firstVideoId = blocks.find((b) => b.block_type === "video")?.id;
  return (
    <div className="space-y-4">
      {blocks.map((block) => {
        if (block.block_type === "video" && block.status === "published") {
          const url = block.content?.url;
          if (isSafeHttpUrl(url)) {
            const useResume =
              resumeBlockId === block.id ||
              (!resumeBlockId && firstVideoId === block.id);
            return (
              <div key={block.id}>
                <ContinueWatchingVideo
                  src={url}
                  lessonId={lessonId}
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
      })}
    </div>
  );
}

export default function LessonViewer({
  delivery,
  access: accessProp,
  engine = null,
  initialBookmarkSaved = false,
  questionCountByActivityId,
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

  const layout = partitionLessonExperienceBlocks(blocks);
  const videoSlot = resolveLessonVideoSlot(blocks);
  const quizCtas = resolveLessonQuizCtas({
    activities,
    questionCountByActivityId,
  });
  const labCards = resolveLessonLabCards(activities);

  const gateMessage = locked
    ? access.message || LEARNING_LESSON_LOCKED_MESSAGE
    : verificationFailed
      ? access.message || LEARNING_LESSON_ACCESS_UNVERIFIED_MESSAGE
      : null;

  return (
    <div
      className="mx-auto mt-6 w-full max-w-3xl space-y-8"
      data-testid="learning-lesson-viewer"
    >
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          {delivery.lesson.course_name}
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">
          {delivery.lesson.name}
        </h1>
        {delivery.lesson.description ? (
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            {delivery.lesson.description}
          </p>
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
        {canRender ? (
          <div className="mt-4">
            <LessonBookmarkControl
              lessonId={delivery.lesson.id}
              initialSaved={initialBookmarkSaved}
            />
          </div>
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
          <section
            className="space-y-3"
            data-testid="learning-lesson-video-slot"
            aria-label="Lesson video"
          >
            <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
              Video
            </h2>
            {videoSlot.kind === "playable" ? (
              <ContinueWatchingVideo
                src={videoSlot.url}
                lessonId={delivery.lesson.id}
                contentBlockId={videoSlot.block.id}
                initialSeconds={
                  resumeBlockId === videoSlot.block.id || !resumeBlockId
                    ? resumeSeconds
                    : null
                }
                caption={videoSlot.caption ?? undefined}
                provider={asVideoProvider(videoSlot.provider)}
              />
            ) : (
              <div
                className="flex aspect-video w-full flex-col items-center justify-center rounded-[24px] border border-dashed border-white/20 bg-gradient-to-b from-white/[0.06] to-transparent px-6 text-center"
                data-testid="learning-lesson-video-coming-soon"
                role="status"
              >
                <p className="text-lg font-black tracking-tight text-white/90">
                  Video lesson coming soon
                </p>
                <p className="mt-2 max-w-md text-sm text-white/50">
                  Narration script and visual plan are ready. A playable video
                  will appear here when the media asset is published.
                </p>
              </div>
            )}
          </section>

          <section
            className="space-y-4"
            data-testid="learning-lesson-content"
            aria-label="Lesson content"
          >
            <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
              Lesson content
            </h2>
            {layout.main.length === 0 ? (
              <p className="text-sm text-white/45">No published lesson body yet.</p>
            ) : (
              <BlockStack
                blocks={layout.main}
                resumeSeconds={resumeSeconds}
                resumeBlockId={resumeBlockId}
                lessonId={delivery.lesson.id}
              />
            )}
          </section>

          {layout.transcripts.length > 0 ||
          layout.supporting.length > 0 ||
          layout.resources.length > 0 ? (
            <section className="space-y-3" aria-label="Supporting materials">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
                Supporting materials
              </h2>
              {layout.transcripts.map((block) => (
                <details
                  key={block.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  data-testid="learning-lesson-transcript"
                >
                  <summary className="cursor-pointer text-sm font-bold text-white/80">
                    Transcript / narration script
                  </summary>
                  <div className="mt-3">
                    <ContentBlockRenderer block={block} />
                  </div>
                </details>
              ))}
              {layout.supporting.length > 0 ? (
                <details className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <summary className="cursor-pointer text-sm font-bold text-white/80">
                    Checkpoints & production notes
                  </summary>
                  <div className="mt-3 space-y-4">
                    <BlockStack
                      blocks={layout.supporting}
                      resumeSeconds={null}
                      resumeBlockId={null}
                      lessonId={delivery.lesson.id}
                    />
                  </div>
                </details>
              ) : null}
              {layout.resources.length > 0 ? (
                <div className="space-y-3" data-testid="learning-lesson-resources">
                  <h3 className="text-sm font-bold text-white/70">Resources</h3>
                  <BlockStack
                    blocks={layout.resources}
                    resumeSeconds={null}
                    resumeBlockId={null}
                    lessonId={delivery.lesson.id}
                  />
                </div>
              ) : null}
            </section>
          ) : null}

          <section
            className="space-y-3"
            data-testid="learning-lesson-lab"
            aria-label="Lab"
          >
            <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
              Lab
            </h2>
            {layout.labContent.length > 0 ? (
              <BlockStack
                blocks={layout.labContent}
                resumeSeconds={null}
                resumeBlockId={null}
                lessonId={delivery.lesson.id}
              />
            ) : null}
            {labCards.length === 0 ? (
              <p className="text-sm text-white/45">No lab activity for this lesson.</p>
            ) : (
              <ul className="space-y-2">
                {labCards.map((lab) => (
                  <li key={lab.activity_id}>
                    <Link
                      href={lab.href}
                      className="watch-focus-ring block rounded-2xl border border-white/10 bg-[#080816]/60 px-4 py-4 transition hover:border-sky-300/40"
                      data-testid={`learning-lesson-lab-cta-${lab.activity_id}`}
                    >
                      <p className="font-bold text-white/90">{lab.name}</p>
                      {lab.description ? (
                        <p className="mt-1 text-sm text-white/50">{lab.description}</p>
                      ) : (
                        <p className="mt-1 text-sm text-white/50">
                          Open the lab workspace for this lesson.
                        </p>
                      )}
                      <p className="mt-3 text-sm font-bold text-sky-300">Open lab →</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            className="space-y-3"
            data-testid="learning-lesson-quiz"
            aria-label="Quiz"
          >
            <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
              Quiz / assessment
            </h2>
            {quizCtas.length === 0 ? (
              <p className="text-sm text-white/45">No quiz for this lesson yet.</p>
            ) : (
              <ul className="space-y-3">
                {quizCtas.map((quiz) => (
                  <li key={quiz.activity_id}>
                    <div
                      className="rounded-[24px] border border-sky-400/25 bg-sky-500/10 px-5 py-5"
                      data-testid={`learning-lesson-quiz-card-${quiz.activity_id}`}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sky-100/70">
                        Lesson quiz
                      </p>
                      <p className="mt-1 text-lg font-black text-white">{quiz.name}</p>
                      <p className="mt-2 text-sm text-white/60">
                        {quiz.question_count != null
                          ? `${quiz.question_count} question${
                              quiz.question_count === 1 ? "" : "s"
                            }`
                          : "Questions available"}
                        {" · "}
                        {quiz.attempt_label}
                      </p>
                      <Link
                        href={quiz.href}
                        className="watch-focus-ring mt-4 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
                        data-testid={`learning-lesson-quiz-cta-${quiz.activity_id}`}
                      >
                        {quiz.cta_label}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
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
          className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#080816]/95 px-4 py-3 backdrop-blur-xl md:static md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none md:border-t md:border-white/10 md:pt-4"
          data-testid="learning-lesson-nav"
        >
          {delivery.previous_lesson ? (
            <Link
              href={delivery.previous_lesson.href}
              className="watch-focus-ring text-sm font-bold text-white/70 hover:text-white"
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
              className="watch-focus-ring text-sm font-bold text-white/70 hover:text-white"
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
