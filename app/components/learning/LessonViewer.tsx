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
  type LearningLearnerLessonDelivery,
} from "../../../lib/learning/learnerDelivery";
import type { LearningLessonEnginePayload } from "../../../lib/learning/lessonEngineFoundation";
import { completeLearningLessonAction } from "../../learning/progressActions";
import { unlockLessonWithUmPointsAction } from "../../learning/firstCourseActions";

type LessonViewerProps = {
  delivery: LearningLearnerLessonDelivery;
  engine?: LearningLessonEnginePayload | null;
};

export default function LessonViewer({
  delivery,
  engine = null,
}: LessonViewerProps) {
  const hasNav = Boolean(delivery.previous_lesson || delivery.next_lesson);
  const handoff = resolveLessonCompletionHandoff({
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

  return (
    <div className="mt-6 space-y-6">
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
          {engine?.lesson.difficulty
            ? ` · ${engine.lesson.difficulty}`
            : ""}
          {engine?.lesson.estimated_duration_minutes != null
            ? ` · ~${engine.lesson.estimated_duration_minutes} min`
            : ""}
        </p>
        {engine?.ai_tutor_enabled ? (
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

      {engine && engine.objectives.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            Learning objectives
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-white/75">
            {engine.objectives.map((o) => (
              <li key={o.id}>{o.objective_text}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {engine && engine.prerequisites.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            Prerequisites
          </h2>
          <ul className="space-y-1 text-sm">
            {engine.prerequisites.map((p) => (
              <li key={p.prerequisite_lesson_id} className="text-white/75">
                {p.satisfied ? "✓" : "○"} {p.name}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {unlock && unlock.locked && !unlock.unlocked ? (
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

      <section className="space-y-4">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          Content
        </h2>
        {delivery.blocks.length === 0 ? (
          <p className="text-sm text-white/45">No published content blocks.</p>
        ) : (
          delivery.blocks.map((block) => {
            if (block.block_type === "video" && block.status === "published") {
              const url = block.content?.url;
              if (isSafeHttpUrl(url)) {
                const useResume =
                  resumeBlockId === block.id ||
                  (!resumeBlockId &&
                    delivery.blocks.find((b) => b.block_type === "video")?.id ===
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
        <ActivityList activities={delivery.activities} />
      </section>

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
        >
          {delivery.previous_lesson ? (
            <Link
              href={delivery.previous_lesson.href}
              className="watch-focus-ring text-sm font-bold text-white/60 hover:text-white"
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
            >
              Next →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
