import type { InstructorLessonSummary } from "../../../../lib/learning/instructorAuthoring";
import {
  archiveLearningLessonAction,
  publishLearningLessonAction,
} from "../../../learning/instructor/actions";

export default function LessonLifecycleActions({
  lesson,
  errorMessage,
}: {
  lesson: InstructorLessonSummary;
  errorMessage?: string | null;
}) {
  return (
    <div className="space-y-3">
      {errorMessage ? (
        <p
          role="alert"
          className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {errorMessage}
        </p>
      ) : null}

      {lesson.status === "draft" ? (
        <form action={publishLearningLessonAction}>
          <input type="hidden" name="lessonId" value={lesson.id} />
          <button
            type="submit"
            className="watch-focus-ring w-full rounded-full bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:bg-white/90"
          >
            Publish lesson
          </button>
        </form>
      ) : null}

      {lesson.status !== "archived" ? (
        <form action={archiveLearningLessonAction}>
          <input type="hidden" name="lessonId" value={lesson.id} />
          <button
            type="submit"
            className="watch-focus-ring w-full rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/[0.07]"
          >
            Archive lesson
          </button>
        </form>
      ) : (
        <p className="text-sm text-white/50">This lesson is archived.</p>
      )}
    </div>
  );
}
