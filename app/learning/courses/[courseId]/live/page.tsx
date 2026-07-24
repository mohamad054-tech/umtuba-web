import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import LearningShell from "../../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import {
  LEARNING_LIVE_ROUTES,
  formatLearningLiveInstant,
  listMyLearningLiveSessions,
  readLiveBoolean,
  readLiveItems,
  readLiveString,
} from "../../../../../lib/learning/liveCalendarFoundation";
import { LEARNING_LEARNER_ROUTES } from "../../../../../lib/learning/learnerDelivery";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function LearnerLiveSchedulePage({ params }: PageProps) {
  const { courseId } = await params;
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_LIVE_ROUTES.learnerSchedule(courseId)
      )}`
    );
  }

  const supabase = await createClient();
  const loaded = await listMyLearningLiveSessions(supabase, courseId, "upcoming");
  if (!loaded.ok) notFound();
  const sessions = readLiveItems(loaded.data, "sessions");

  return (
    <LearningShell
      title="Live classes"
      subtitle="Upcoming sessions for this course"
      backHref={LEARNING_LEARNER_ROUTES.course(courseId)}
      backLabel="Course"
    >
      <nav className="mt-3 flex flex-wrap gap-3 text-sm">
        <Link
          href={LEARNING_LIVE_ROUTES.learnerCalendar(courseId)}
          className="font-bold text-white underline underline-offset-2"
        >
          Calendar
        </Link>
      </nav>

      {sessions.length === 0 ? (
        <p className="mt-6 text-sm text-white/55">No upcoming live sessions.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {sessions.map((session) => {
            const id = readLiveString(session, "session_id");
            if (!id) return null;
            const status = readLiveString(session, "status") ?? "scheduled";
            const cancelled = status === "cancelled";
            return (
              <li key={id}>
                <Link
                  href={LEARNING_LIVE_ROUTES.learnerSession(courseId, id)}
                  className="block rounded-2xl border border-white/10 bg-[#080816]/60 px-4 py-3 hover:border-white/25"
                >
                  <p className="font-bold text-white/90">
                    {readLiveString(session, "title")}
                    {cancelled ? " (cancelled)" : ""}
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    {formatLearningLiveInstant(readLiveString(session, "starts_at"))}
                    {" → "}
                    {formatLearningLiveInstant(readLiveString(session, "ends_at"))}
                    {" · "}
                    {status}
                    {readLiveBoolean(session, "join_eligible")
                      ? " · join open"
                      : ""}
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
