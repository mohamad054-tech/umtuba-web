import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../components/learning/LearningShell";
import {
  LearningCardShell,
  LearningStatePanel,
  LearningStatusBadge,
} from "../../components/learning/ds";
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
        <div className="mt-6">
          <LearningStatePanel title="Transcript unavailable" tone="danger">
            {loaded.message}
          </LearningStatePanel>
        </div>
      ) : loaded.data.entries.length === 0 ? (
        <div className="mt-6">
          <LearningStatePanel title="No completed courses yet">
            Finish a course to see it on your transcript and request a
            certificate.
          </LearningStatePanel>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {loaded.data.entries.map((entry) => (
            <li key={entry.course_id}>
              <LearningCardShell>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-lg font-black tracking-tight text-white">
                    {entry.course_name}
                  </h2>
                  <LearningStatusBadge
                    tone={
                      entry.certificate_status === "issued"
                        ? "success"
                        : "warning"
                    }
                  >
                    {entry.certificate_status === "issued"
                      ? "Certificate issued"
                      : "Certificate pending"}
                  </LearningStatusBadge>
                </div>
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
                    <dt className="text-white/35">Certificate code</dt>
                    <dd>
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
                    <input
                      type="hidden"
                      name="courseId"
                      value={entry.course_id}
                    />
                    <button
                      type="submit"
                      className="watch-focus-ring inline-flex min-h-11 items-center rounded-full bg-white px-4 py-2 text-sm font-black text-black"
                    >
                      Finalize completion / certificate
                    </button>
                  </form>
                ) : null}
              </LearningCardShell>
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
