import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import LearningShell from "../../../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../../../lib/supabase/server";
import {
  LEARNING_LIVE_ROUTES,
  formatLearningLiveInstant,
  listLearningLiveSessionsForManage,
  readLiveItems,
  readLiveString,
} from "../../../../../../lib/learning/liveCalendarFoundation";
import { LEARNING_INSTRUCTOR_ROUTES } from "../../../../../../lib/learning/instructorAuthoring";
import { createLiveSessionAction } from "../../../../liveCalendarActions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string }>;
  searchParams?: Promise<{ error?: string; scope?: string }>;
};

export default async function InstructorLiveSessionsPage({
  params,
  searchParams,
}: PageProps) {
  const { courseId } = await params;
  const sp = searchParams ? await searchParams : {};
  const scope =
    sp.scope === "past" || sp.scope === "all" ? sp.scope : "upcoming";
  const path = LEARNING_LIVE_ROUTES.instructorSessions(courseId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);

  const supabase = await createClient();
  const loaded = await listLearningLiveSessionsForManage(
    supabase,
    courseId,
    scope
  );
  if (!loaded.ok) notFound();
  const sessions = readLiveItems(loaded.data, "sessions");

  return (
    <LearningShell
      title="Live sessions"
      subtitle="Schedule and manage live classes"
      backHref={LEARNING_INSTRUCTOR_ROUTES.course(courseId)}
      backLabel="Course authoring"
    >
      <nav className="mt-3 flex flex-wrap gap-3 text-sm">
        <Link href={`${path}?scope=upcoming`} className="font-bold text-white/70 underline">
          Upcoming
        </Link>
        <Link href={`${path}?scope=past`} className="font-bold text-white/70 underline">
          Past
        </Link>
        <Link
          href={LEARNING_LIVE_ROUTES.instructorCalendar(courseId)}
          className="font-bold text-white underline underline-offset-2"
        >
          Calendar
        </Link>
      </nav>

      {sp.error ? (
        <p className="mt-4 rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-100">
          {sp.error}
        </p>
      ) : null}

      <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-base font-bold">Create live class</h2>
        <form action={createLiveSessionAction} className="mt-3 space-y-3">
          <input type="hidden" name="courseId" value={courseId} />
          <input
            name="title"
            required
            maxLength={200}
            placeholder="Title"
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
          />
          <textarea
            name="description"
            rows={3}
            maxLength={10000}
            placeholder="Description (optional)"
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
          />
          <label className="block text-xs text-white/50">
            Starts at (local)
            <input
              type="datetime-local"
              name="startsAt"
              required
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-white/50">
            Ends at (local)
            <input
              type="datetime-local"
              name="endsAt"
              required
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-black"
          >
            Schedule
          </button>
        </form>
      </section>

      {sessions.length === 0 ? (
        <p className="mt-6 text-sm text-white/55">No sessions in this scope.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {sessions.map((session) => {
            const id = readLiveString(session, "session_id");
            if (!id) return null;
            return (
              <li key={id}>
                <Link
                  href={LEARNING_LIVE_ROUTES.instructorSession(courseId, id)}
                  className="block rounded-2xl border border-white/10 bg-[#080816]/60 px-4 py-3 hover:border-white/25"
                >
                  <p className="font-bold text-white/90">
                    {readLiveString(session, "title")}
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    {formatLearningLiveInstant(readLiveString(session, "starts_at"))}
                    {" · "}
                    {readLiveString(session, "status")}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </LearningShell>
  );
}
