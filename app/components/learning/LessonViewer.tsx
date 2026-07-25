import Link from "next/link";
import ContentBlockRenderer from "./ContentBlockRenderer";
import ActivityList from "./ActivityList";
import type { LearningLearnerLessonDelivery } from "../../../lib/learning/learnerDelivery";

type LessonViewerProps = {
  delivery: LearningLearnerLessonDelivery;
};

export default function LessonViewer({ delivery }: LessonViewerProps) {
  const hasNav = Boolean(delivery.previous_lesson || delivery.next_lesson);

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
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          Content
        </h2>
        {delivery.blocks.length === 0 ? (
          <p className="text-sm text-white/45">No published content blocks.</p>
        ) : (
          delivery.blocks.map((block) => (
            <div key={block.id}>
              <ContentBlockRenderer block={block} />
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          Activities
        </h2>
        <ActivityList activities={delivery.activities} />
      </section>

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
