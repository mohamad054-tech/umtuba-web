import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import {
  LEARNING_LAB_ROUTES,
  loadMyLab,
} from "../../../../../lib/learning/labsFoundation";
import {
  LEARNING_LEARNER_ROUTES,
  loadPublishedActivityGate,
} from "../../../../../lib/learning/learnerDelivery";
import { requireLessonUnlockedForLearner } from "../../../../../lib/learning/lessonUnlockFoundation";
import {
  completeLabAction,
  startLabAction,
} from "../../../firstCourseActions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ activityId: string }> | { activityId: string };
  searchParams?:
    | Promise<{ error?: string; completed?: string }>
    | { error?: string; completed?: string };
};

export default async function LearnerLabPage({ params, searchParams }: PageProps) {
  const { activityId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_LAB_ROUTES.learner(activityId))}`
    );
  }

  const supabase = await createClient();
  const gate = await loadPublishedActivityGate(supabase, activityId);
  if (gate.ok) {
    const unlock = await requireLessonUnlockedForLearner(
      supabase,
      gate.data.lesson_id
    );
    if (!unlock.ok) {
      redirect(
        `${LEARNING_LEARNER_ROUTES.lesson(gate.data.lesson_id)}?error=${encodeURIComponent(unlock.message)}`
      );
    }
  }
  const loaded = await loadMyLab(supabase, activityId);
  const starterFiles =
    loaded.ok && Array.isArray(loaded.data.starter_files)
      ? (loaded.data.starter_files as Array<Record<string, unknown>>)
      : [];
  const resources =
    loaded.ok && Array.isArray(loaded.data.resources)
      ? (loaded.data.resources as Array<Record<string, unknown>>)
      : [];
  const completion =
    loaded.ok && loaded.data.completion && typeof loaded.data.completion === "object"
      ? (loaded.data.completion as Record<string, unknown>)
      : null;

  return (
    <LearningShell
      title={
        loaded.ok ? String(loaded.data.activity_name ?? "Lab") : "Lab"
      }
      subtitle="Hands-on lab"
      backHref={LEARNING_LEARNER_ROUTES.hub}
      backLabel="Learning"
    >
      {query.error ? (
        <p role="alert" className="mt-4 text-sm text-rose-100">
          {query.error}
        </p>
      ) : null}
      {query.completed === "1" ? (
        <p role="status" className="mt-4 text-sm text-emerald-100">
          Lab marked complete.
        </p>
      ) : null}

      {!loaded.ok ? (
        <p role="alert" className="mt-6 text-sm text-rose-100">
          {loaded.message}
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          <section>
            <h2 className="text-lg font-bold text-white">Instructions</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-white/70">
              {String(loaded.data.instructions || "No instructions yet.")}
            </p>
          </section>

          {loaded.data.validation_hook ? (
            <p className="text-xs text-white/40">
              Validation hook: {String(loaded.data.validation_hook)}
            </p>
          ) : null}

          {starterFiles.length > 0 ? (
            <section>
              <h2 className="text-lg font-bold text-white">Starter files</h2>
              <ul className="mt-2 space-y-1 text-sm text-white/70">
                {starterFiles.map((f, i) => (
                  <li key={i}>
                    {String(f.label ?? f.name ?? f.url ?? `File ${i + 1}`)}
                    {typeof f.url === "string" ? (
                      <>
                        {" · "}
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          open
                        </a>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {resources.length > 0 ? (
            <section>
              <h2 className="text-lg font-bold text-white">Resources</h2>
              <ul className="mt-2 space-y-1 text-sm text-white/70">
                {resources.map((r, i) => (
                  <li key={i}>
                    {typeof r.url === "string" ? (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        {String(r.label ?? r.url)}
                      </a>
                    ) : (
                      String(r.label ?? `Resource ${i + 1}`)
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {completion ? (
            <p className="text-sm text-emerald-100">
              Completed · {String(completion.status ?? "completed")}
            </p>
          ) : (
            <section className="flex flex-wrap gap-3">
              <form action={startLabAction}>
                <input type="hidden" name="activityId" value={activityId} />
                <button
                  type="submit"
                  className="watch-focus-ring rounded-full border border-white/20 px-4 py-2 text-sm font-bold text-white"
                >
                  Start lab
                </button>
              </form>
              <form action={completeLabAction}>
                <input type="hidden" name="activityId" value={activityId} />
                <button
                  type="submit"
                  className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
                >
                  Mark complete
                </button>
              </form>
            </section>
          )}

          <p className="text-xs text-white/40">
            <Link
              href={LEARNING_LEARNER_ROUTES.hub}
              className="underline underline-offset-2"
            >
              Back to Learning
            </Link>
          </p>
        </div>
      )}
    </LearningShell>
  );
}
