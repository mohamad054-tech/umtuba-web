import { redirect, notFound } from "next/navigation";
import LearningShell from "../../../../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../../../../lib/supabase/server";
import {
  LEARNING_LIVE_ROUTES,
  formatLearningLiveInstant,
  getLearningLiveSession,
  listLearningLiveSessionAttendance,
  readLiveItems,
  readLiveString,
} from "../../../../../../../lib/learning/liveCalendarFoundation";
import {
  cancelLiveSessionAction,
  completeLiveSessionAction,
  startLiveSessionAction,
  updateLiveSessionAction,
} from "../../../../../liveCalendarActions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string; sessionId: string }>;
  searchParams?: Promise<{ error?: string; saved?: string }>;
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function InstructorLiveSessionPage({
  params,
  searchParams,
}: PageProps) {
  const { courseId, sessionId } = await params;
  const sp = searchParams ? await searchParams : {};
  const path = LEARNING_LIVE_ROUTES.instructorSession(courseId, sessionId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);

  const supabase = await createClient();
  const loaded = await getLearningLiveSession(supabase, sessionId);
  if (!loaded.ok) notFound();
  const attendance = await listLearningLiveSessionAttendance(supabase, sessionId);
  const session = loaded.data;
  const status = readLiveString(session, "status") ?? "scheduled";
  const editable = status === "scheduled";

  return (
    <LearningShell
      title={readLiveString(session, "title") ?? "Live session"}
      subtitle={`Manage · ${status}`}
      backHref={LEARNING_LIVE_ROUTES.instructorSessions(courseId)}
      backLabel="Live sessions"
    >
      {sp.error ? (
        <p className="mt-4 rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-100">
          {sp.error}
        </p>
      ) : null}
      {sp.saved ? (
        <p className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
          Saved.
        </p>
      ) : null}

      <p className="mt-4 text-sm text-white/55">
        {formatLearningLiveInstant(readLiveString(session, "starts_at"))}
        {" → "}
        {formatLearningLiveInstant(readLiveString(session, "ends_at"))}
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {status === "scheduled" ? (
          <form action={startLiveSessionAction}>
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="sessionId" value={sessionId} />
            <button
              type="submit"
              className="rounded-lg border border-white/20 px-3 py-1.5 font-bold text-white/80"
            >
              Go live
            </button>
          </form>
        ) : null}
        {status === "scheduled" || status === "live" ? (
          <>
            <form action={completeLiveSessionAction}>
              <input type="hidden" name="courseId" value={courseId} />
              <input type="hidden" name="sessionId" value={sessionId} />
              <button
                type="submit"
                className="rounded-lg border border-white/20 px-3 py-1.5 font-bold text-white/80"
              >
                Mark completed
              </button>
            </form>
            <form action={cancelLiveSessionAction}>
              <input type="hidden" name="courseId" value={courseId} />
              <input type="hidden" name="sessionId" value={sessionId} />
              <button
                type="submit"
                className="rounded-lg border border-rose-400/40 px-3 py-1.5 font-bold text-rose-100"
              >
                Cancel
              </button>
            </form>
          </>
        ) : null}
      </div>

      {editable ? (
        <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="text-sm font-bold">Update before start</h2>
          <form action={updateLiveSessionAction} className="mt-3 space-y-3">
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="sessionId" value={sessionId} />
            <input
              name="title"
              required
              defaultValue={readLiveString(session, "title") ?? ""}
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
            />
            <textarea
              name="description"
              rows={3}
              defaultValue={readLiveString(session, "description") ?? ""}
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
            />
            <input
              type="datetime-local"
              name="startsAt"
              defaultValue={toLocalInput(readLiveString(session, "starts_at"))}
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
            />
            <input
              type="datetime-local"
              name="endsAt"
              defaultValue={toLocalInput(readLiveString(session, "ends_at"))}
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-black"
            >
              Save
            </button>
          </form>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-base font-bold">Attendance</h2>
        {!attendance.ok ? (
          <p className="mt-2 text-sm text-white/50">{attendance.message}</p>
        ) : readLiveItems(attendance.data, "attendance").length === 0 ? (
          <p className="mt-2 text-sm text-white/50">No attendance yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            {readLiveItems(attendance.data, "attendance").map((row) => {
              const attendanceId = readLiveString(row, "attendance_id");
              return (
              <li
                key={attendanceId ?? readLiveString(row, "user_id") ?? "row"}
                className="rounded-lg border border-white/10 px-3 py-2"
              >
                {readLiveString(row, "learner_label") ?? "Learner"} · joined{" "}
                {formatLearningLiveInstant(readLiveString(row, "joined_at"))}
              </li>
              );
            })}
          </ul>
        )}
      </section>
    </LearningShell>
  );
}
