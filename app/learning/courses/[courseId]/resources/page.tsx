import { redirect } from "next/navigation";
import LearningShell from "../../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import {
  LEARNING_COURSE_RESOURCE_ROUTES,
  listMyCourseResources,
} from "../../../../../lib/learning/courseResourcesFoundation";
import { LEARNING_LEARNER_ROUTES } from "../../../../../lib/learning/learnerDelivery";
import { trackCourseResourceDownloadAction } from "../../../firstCourseActions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string }> | { courseId: string };
  searchParams?: Promise<{ error?: string }> | { error?: string };
};

export default async function CourseResourcesPage({
  params,
  searchParams,
}: PageProps) {
  const { courseId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_COURSE_RESOURCE_ROUTES.learner(courseId)
      )}`
    );
  }

  const supabase = await createClient();
  const loaded = await listMyCourseResources(supabase, courseId);
  const resources =
    loaded.ok && Array.isArray(loaded.data.resources)
      ? (loaded.data.resources as Array<Record<string, unknown>>)
      : [];

  return (
    <LearningShell
      title="Course resources"
      subtitle="Downloads and links"
      layout="wide"
      backHref={LEARNING_LEARNER_ROUTES.course(courseId)}
      backLabel="Course"
    >
      {query.error ? (
        <p role="alert" className="mt-4 text-sm text-rose-100">
          {query.error}
        </p>
      ) : null}
      {!loaded.ok ? (
        <p role="alert" className="mt-6 text-sm text-rose-100">
          {loaded.message}
        </p>
      ) : resources.length === 0 ? (
        <p className="mt-6 text-sm text-white/50">No published resources yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {resources.map((r) => (
            <li
              key={String(r.id)}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <div>
                <p className="font-bold text-white">{String(r.title)}</p>
                <p className="text-xs text-white/40">
                  {String(r.resource_kind)}
                  {r.filename ? ` · ${String(r.filename)}` : ""}
                </p>
              </div>
              <form action={trackCourseResourceDownloadAction}>
                <input type="hidden" name="resourceId" value={String(r.id)} />
                <input type="hidden" name="courseId" value={courseId} />
                <input type="hidden" name="url" value={String(r.url ?? "")} />
                <button
                  type="submit"
                  className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
                >
                  Open / Download
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </LearningShell>
  );
}
