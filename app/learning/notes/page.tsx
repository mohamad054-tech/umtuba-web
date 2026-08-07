import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import {
  isLessonNotesUuid,
  listMyLearningNotesHub,
  type LearningLessonNoteHubItem,
} from "../../../lib/learning/lessonNotesFoundation";
import { LEARNING_LEARNER_ROUTES } from "../../../lib/learning/learnerDelivery";

export const metadata = {
  title: "My Notes | UMTUBA Learning",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?:
    | Promise<{ course?: string }>
    | { course?: string };
};

function formatUpdatedAt(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function previewBody(body: string, max = 220) {
  const trimmed = body.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

function NoteRow({ note }: { note: LearningLessonNoteHubItem }) {
  return (
    <li
      data-testid="learning-notes-hub-item"
      className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
        {note.course_name}
      </p>
      <h2 className="mt-1 text-base font-bold text-white">{note.lesson_name}</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm text-white/75">
        {previewBody(note.body)}
      </p>
      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/45">
        <div>
          <dt className="sr-only">Updated</dt>
          <dd>Updated {formatUpdatedAt(note.updated_at)}</dd>
        </div>
        {note.lesson_position_seconds != null ? (
          <div>
            <dt className="sr-only">Position</dt>
            <dd>{note.lesson_position_seconds}s</dd>
          </div>
        ) : null}
      </dl>
      <p className="mt-3">
        <Link
          href={LEARNING_LEARNER_ROUTES.lesson(note.lesson_id)}
          className="text-sm font-bold text-sky-300 underline underline-offset-2 hover:text-sky-200"
          data-testid="learning-notes-hub-open-lesson"
        >
          Open lesson
        </Link>
      </p>
    </li>
  );
}

export default async function LearningNotesHubPage({ searchParams }: PageProps) {
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_LEARNER_ROUTES.notes)}`
    );
  }

  const rawCourse = typeof query.course === "string" ? query.course.trim() : "";
  const courseId =
    rawCourse && isLessonNotesUuid(rawCourse) ? rawCourse : null;

  const supabase = await createClient();
  const loaded = await listMyLearningNotesHub(supabase, {
    courseId,
  });

  return (
    <LearningShell
      title="My notes"
      subtitle="Private notes across your lessons"
      backHref={LEARNING_LEARNER_ROUTES.hub}
      backLabel="Learning"
    >
      <div data-testid="learning-notes-hub">
        {courseId ? (
          <p className="mt-3 text-xs text-white/45">
            Filtered to one course.{" "}
            <Link
              href={LEARNING_LEARNER_ROUTES.notes}
              className="font-bold text-white underline underline-offset-2"
            >
              Show all notes
            </Link>
          </p>
        ) : null}

        {!loaded.ok ? (
          <p
            role="alert"
            className="mt-6 rounded-lg border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100"
            data-testid="learning-notes-hub-error"
          >
            {loaded.message}
          </p>
        ) : loaded.data.notes.length === 0 ? (
          <p
            className="mt-6 text-sm text-white/55"
            data-testid="learning-notes-hub-empty"
          >
            No personal notes yet. Open a lesson and add a private note while
            you study.
          </p>
        ) : (
          <ul className="mt-6 space-y-4" data-testid="learning-notes-hub-list">
            {loaded.data.notes.map((note) => (
              <NoteRow key={note.id} note={note} />
            ))}
          </ul>
        )}

        {loaded.ok && loaded.data.has_more ? (
          <p className="mt-4 text-xs text-white/40">
            Showing the {loaded.data.limit} most recently updated notes.
          </p>
        ) : null}
      </div>
    </LearningShell>
  );
}
