import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import LearningShell from "../../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import {
  LEARNING_LIVE_ROUTES,
  formatLearningLiveInstant,
  getMyLearningCalendar,
  readLiveItems,
  readLiveString,
} from "../../../../../lib/learning/liveCalendarFoundation";
import { LEARNING_LEARNER_ROUTES } from "../../../../../lib/learning/learnerDelivery";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function LearnerCourseCalendarPage({ params }: PageProps) {
  const { courseId } = await params;
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_LIVE_ROUTES.learnerCalendar(courseId)
      )}`
    );
  }

  const from = new Date();
  from.setDate(from.getDate() - 7);
  const to = new Date();
  to.setDate(to.getDate() + 60);

  const supabase = await createClient();
  const loaded = await getMyLearningCalendar(supabase, {
    from: from.toISOString(),
    to: to.toISOString(),
    courseId,
  });
  if (!loaded.ok) notFound();
  const items = readLiveItems(loaded.data, "items");

  return (
    <LearningShell
      title="Course calendar"
      subtitle="Live sessions and assignment due dates"
      backHref={LEARNING_LEARNER_ROUTES.course(courseId)}
      backLabel="Course"
    >
      <nav className="mt-3 flex flex-wrap gap-3 text-sm">
        <Link
          href={LEARNING_LIVE_ROUTES.learnerSchedule(courseId)}
          className="font-bold text-white underline underline-offset-2"
        >
          Live schedule
        </Link>
      </nav>

      {items.length === 0 ? (
        <p className="mt-6 text-sm text-white/55">No calendar items in range.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((item) => {
            const kind = readLiveString(item, "kind");
            const id = readLiveString(item, "item_id");
            const href =
              kind === "live_session" && id
                ? LEARNING_LIVE_ROUTES.learnerSession(courseId, id)
                : LEARNING_LIVE_ROUTES.learnerSchedule(courseId);
            return (
              <li key={`${kind}-${id}`}>
                <Link
                  href={href}
                  className="block rounded-2xl border border-white/10 bg-[#080816]/60 px-4 py-3 hover:border-white/25"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
                    {(kind ?? "item").replaceAll("_", " ")}
                    {readLiveString(item, "status")
                      ? ` · ${readLiveString(item, "status")}`
                      : ""}
                  </p>
                  <p className="mt-1 font-bold text-white/90">
                    {readLiveString(item, "title")}
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    {formatLearningLiveInstant(readLiveString(item, "occurs_at"))}
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
