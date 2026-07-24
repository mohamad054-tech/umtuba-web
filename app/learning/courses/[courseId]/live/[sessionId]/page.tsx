import { redirect, notFound } from "next/navigation";
import LearningShell from "../../../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../../../lib/supabase/server";
import {
  LEARNING_LIVE_ROUTES,
  formatLearningLiveInstant,
  getLearningLiveSession,
  getLearningLiveSessionJoinGate,
  getMyLearningLiveAttendance,
  readLiveBoolean,
  readLiveString,
} from "../../../../../../lib/learning/liveCalendarFoundation";
import {
  joinLiveSessionAction,
  leaveLiveSessionAction,
} from "../../../../liveCalendarActions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string; sessionId: string }>;
  searchParams?: Promise<{ error?: string; joined?: string; blocker?: string }>;
};

export default async function LearnerLiveSessionPage({
  params,
  searchParams,
}: PageProps) {
  const { courseId, sessionId } = await params;
  const sp = searchParams ? await searchParams : {};
  const path = LEARNING_LIVE_ROUTES.learnerSession(courseId, sessionId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);

  const supabase = await createClient();
  const loaded = await getLearningLiveSession(supabase, sessionId);
  if (!loaded.ok) notFound();
  const gate = await getLearningLiveSessionJoinGate(supabase, sessionId);
  const attendance = await getMyLearningLiveAttendance(supabase, sessionId);
  const session = loaded.data;
  const status = readLiveString(session, "status") ?? "scheduled";
  const canJoin = gate.ok && readLiveBoolean(gate.data, "can_join");

  return (
    <LearningShell
      title={readLiveString(session, "title") ?? "Live class"}
      subtitle={`Status: ${status}`}
      backHref={LEARNING_LIVE_ROUTES.learnerSchedule(courseId)}
      backLabel="Live schedule"
    >
      {sp.error ? (
        <p className="mt-4 rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-100">
          {sp.error}
        </p>
      ) : null}
      {sp.blocker ? (
        <p className="mt-4 rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          {sp.blocker}
        </p>
      ) : null}
      {sp.joined ? (
        <p className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
          Attendance recorded.
        </p>
      ) : null}

      {status === "cancelled" ? (
        <p className="mt-6 rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          This live class has been cancelled.
        </p>
      ) : null}

      <article className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/75">
        <p>
          {formatLearningLiveInstant(readLiveString(session, "starts_at"))}
          {" → "}
          {formatLearningLiveInstant(readLiveString(session, "ends_at"))}
        </p>
        {readLiveString(session, "description") ? (
          <p className="mt-3 whitespace-pre-wrap">
            {readLiveString(session, "description")}
          </p>
        ) : null}
        {gate.ok ? (
          <p className="mt-3 text-xs text-white/45">
            Join window:{" "}
            {readLiveBoolean(gate.data, "in_join_window") ? "open" : "closed"} ·
            reason {readLiveString(gate.data, "reason")}
          </p>
        ) : null}
        {attendance.ok && attendance.data.attendance ? (
          <p className="mt-2 text-xs text-white/45">
            Your attendance is on file for this session.
          </p>
        ) : null}
      </article>

      <div className="mt-4 flex flex-wrap gap-2">
        {canJoin ? (
          <form action={joinLiveSessionAction}>
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="sessionId" value={sessionId} />
            <button
              type="submit"
              className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-black"
            >
              Join session
            </button>
          </form>
        ) : (
          <p className="text-sm text-white/50">Join is not available right now.</p>
        )}
        <form action={leaveLiveSessionAction}>
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="sessionId" value={sessionId} />
          <button
            type="submit"
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-bold text-white/80"
          >
            Leave
          </button>
        </form>
      </div>
    </LearningShell>
  );
}
