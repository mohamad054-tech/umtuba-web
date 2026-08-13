import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import {
  LEARNING_COMPLETION_ROUTES,
  loadMyLearningTranscript,
} from "../../../lib/learning/completionFoundation";
import { finalizeCourseCompletionAction } from "../completionActions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?:
    | Promise<{ error?: string; issued?: string }>
    | { error?: string; issued?: string };
};

export default async function LearningTranscriptPage({
  searchParams,
}: PageProps) {
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_COMPLETION_ROUTES.transcript)}`
    );
  }

  const supabase = await createClient();
  const loaded = await loadMyLearningTranscript(supabase);

  return (
    <LearningShell
      title="Learning transcript"
      subtitle="Completed courses and certificates"
      layout="wide"
      backHref="/learning"
      backLabel="Learning"
    >
      {query.issued === "1" ? (
        <p
          role="status"
          className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50"
        >
          Certificate recorded.
        </p>
      ) : null}

      {query.error ? (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {query.error}
        </p>
      ) : null}

      {!loaded.ok ? (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100"
        >
          {loaded.message}
        </p>
      ) : loaded.data.entries.length === 0 ? (
        <p
          role="status"
          className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-8 text-center text-sm text-white/55"
        >
          No completed courses yet. Finish a course to see it on your transcript.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {loaded.data.entries.map((entry) => (
            <li
              key={entry.course_id}
              className="rounded-[24px] border border-white/10 bg-[#080816]/70 p-5"
            >
              <h2 className="text-lg font-bold text-white">{entry.course_name}</h2>
              <dl className="mt-3 grid gap-2 text-sm text-white/60 sm:grid-cols-2">
                <div>
                  <dt className="text-white/35">Completed</dt>
                  <dd>{entry.completed_at ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-white/35">Final score</dt>
                  <dd>
                    {entry.final_score != null
                      ? `${entry.final_score}%`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/35">Certificate</dt>
                  <dd className={entry.certificate_status === "issued" ? "font-semibold text-emerald-200" : ""}>
                    {entry.certificate_status === "issued"
                      ? entry.certificate_code ?? "issued"
                      : "Not issued"}
                  </dd>
                </div>
              </dl>

              {entry.certificate_status !== "issued" ? (
                <form
                  action={finalizeCourseCompletionAction}
                  className="mt-4"
                >
                  <input type="hidden" name="courseId" value={entry.course_id} />
                  <button
                    type="submit"
                    className="watch-focus-ring inline-flex min-h-11 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black"
                  >
                    Finalize completion / certificate
                  </button>
                </form>
              ) : (
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/80">
                  Certificate issued
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-xs text-white/40">
        <Link href="/learning" className="underline underline-offset-2">
          Back to learning
        </Link>
        {" · "}
        Metadata only — no PDF certificates in this foundation.
      </p>
    </LearningShell>
  );
}
