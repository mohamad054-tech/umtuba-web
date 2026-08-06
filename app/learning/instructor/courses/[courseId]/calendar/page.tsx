import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import LearningShell from "../../../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../../../lib/supabase/server";
import { instructorCalendarItemHref } from "../../../../../../lib/learning/assessmentDueDates";
import {
  LEARNING_LIVE_ROUTES,
  formatLearningLiveInstant,
  getInstructorLearningCalendar,
  readLiveItems,
  readLiveString,
} from "../../../../../../lib/learning/liveCalendarFoundation";
import { LEARNING_INSTRUCTOR_ROUTES } from "../../../../../../lib/learning/instructorAuthoring";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function InstructorCourseCalendarPage({
  params,
}: PageProps) {
  const { courseId } = await params;
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_LIVE_ROUTES.instructorCalendar(courseId)
      )}`
    );
  }

  const from = new Date();
  from.setDate(from.getDate() - 7);
  const to = new Date();
  to.setDate(to.getDate() + 60);

  const supabase = await createClient();
  const loaded = await getInstructorLearningCalendar(supabase, {
    courseId,
    from: from.toISOString(),
    to: to.toISOString(),
  });
  if (!loaded.ok) notFound();
  const items = readLiveItems(loaded.data, "items");

  return (
    <LearningShell
      title="Instructor calendar"
      subtitle="Managed live sessions, assignment dues, and assessment dues"
      backHref={LEARNING_INSTRUCTOR_ROUTES.course(courseId)}
      backLabel="Course authoring"
    >
      <nav className="mt-3 flex flex-wrap gap-3 text-sm">
        <Link
          href={LEARNING_LIVE_ROUTES.instructorSessions(courseId)}
          className="font-bold text-white underline underline-offset-2"
        >
          Live sessions
        </Link>
      </nav>

      {items.length === 0 ? (
        <p className="mt-6 text-sm text-white/55">No calendar items in range.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((item) => {
            const kind = readLiveString(item, "kind");
            const id = readLiveString(item, "item_id");
            const href = instructorCalendarItemHref(kind, courseId, id);
            return (
              <li key={`${kind}-${id}`}>
                <Link
                  href={href}
                  className="block rounded-2xl border border-white/10 bg-[#080816]/60 px-4 py-3 hover:border-white/25"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
                    {(kind ?? "item").replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 font-bold text-white/90">
                    {readLiveString(item, "title")}
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    {formatLearningLiveInstant(readLiveString(item, "occurs_at"))}
                    {" · "}
                    {readLiveString(item, "status")}
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
