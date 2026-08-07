import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import {
  isLessonBookmarkUuid,
  listMyLearningLessonBookmarks,
  type SavedLessonBookmark,
} from "../../../lib/learning/lessonBookmarksFoundation";
import { LEARNING_LEARNER_ROUTES } from "../../../lib/learning/learnerDelivery";

export const metadata = {
  title: "Saved Lessons | UMTUBA Learning",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ course?: string }> | { course?: string };
};

function formatSavedAt(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function BookmarkRow({ item }: { item: SavedLessonBookmark }) {
  return (
    <li
      data-testid="learning-saved-hub-item"
      className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
        {item.course_name}
      </p>
      <h2 className="mt-1 text-base font-bold text-white">{item.lesson_name}</h2>
      <p className="mt-2 text-xs text-white/45">
        Saved {formatSavedAt(item.created_at)}
      </p>
      <p className="mt-3">
        <Link
          href={LEARNING_LEARNER_ROUTES.lesson(item.lesson_id)}
          className="text-sm font-bold text-sky-300 underline underline-offset-2 hover:text-sky-200"
          data-testid="learning-saved-hub-open-lesson"
        >
          Open lesson
        </Link>
      </p>
    </li>
  );
}

export default async function LearningSavedLessonsPage({
  searchParams,
}: PageProps) {
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_LEARNER_ROUTES.saved)}`
    );
  }

  const rawCourse = typeof query.course === "string" ? query.course.trim() : "";
  const courseId =
    rawCourse && isLessonBookmarkUuid(rawCourse) ? rawCourse : null;

  const supabase = await createClient();
  const loaded = await listMyLearningLessonBookmarks(supabase, {
    courseId,
  });

  return (
    <LearningShell
      title="Saved Lessons"
      subtitle="Lessons you saved for later"
      backHref={LEARNING_LEARNER_ROUTES.hub}
      backLabel="Learning"
    >
      <div data-testid="learning-saved-hub">
        {courseId ? (
          <p className="mt-3 text-xs text-white/45">
            Filtered to one course.{" "}
            <Link
              href={LEARNING_LEARNER_ROUTES.saved}
              className="font-bold text-white underline underline-offset-2"
            >
              Show all saved lessons
            </Link>
          </p>
        ) : null}

        {!loaded.ok ? (
          <p
            role="alert"
            className="mt-6 rounded-lg border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100"
            data-testid="learning-saved-hub-error"
          >
            {loaded.message}
          </p>
        ) : loaded.data.bookmarks.length === 0 ? (
          <p
            className="mt-6 text-sm text-white/55"
            data-testid="learning-saved-hub-empty"
          >
            No saved lessons yet. Open a lesson and choose Save lesson.
          </p>
        ) : (
          <ul className="mt-6 space-y-4" data-testid="learning-saved-hub-list">
            {loaded.data.bookmarks.map((item) => (
              <BookmarkRow key={item.lesson_id} item={item} />
            ))}
          </ul>
        )}

        {loaded.ok && loaded.data.has_more ? (
          <p className="mt-4 text-xs text-white/40">
            Showing the {loaded.data.limit} most recently saved lessons.
          </p>
        ) : null}
      </div>
    </LearningShell>
  );
}
