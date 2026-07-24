import type { InstructorCourseSummary } from "../../../../lib/learning/instructorAuthoring";
import {
  archiveLearningCourseAction,
  publishLearningCourseAction,
} from "../../../learning/instructor/actions";

export default function CourseLifecycleActions({
  course,
  errorMessage,
}: {
  course: InstructorCourseSummary;
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

      {course.status === "draft" ? (
        <form action={publishLearningCourseAction}>
          <input type="hidden" name="courseId" value={course.id} />
          <button
            type="submit"
            className="watch-focus-ring w-full rounded-full bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:bg-white/90"
          >
            Publish course
          </button>
        </form>
      ) : null}

      {course.status !== "archived" ? (
        <form action={archiveLearningCourseAction}>
          <input type="hidden" name="courseId" value={course.id} />
          <button
            type="submit"
            className="watch-focus-ring w-full rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/[0.07]"
          >
            Archive course
          </button>
        </form>
      ) : (
        <p className="text-sm text-white/50">This course is archived.</p>
      )}
    </div>
  );
}
