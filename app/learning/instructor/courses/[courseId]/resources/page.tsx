import { redirect } from "next/navigation";
import LearningShell from "../../../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../../../lib/supabase/server";
import {
  LEARNING_COURSE_RESOURCE_KINDS,
  LEARNING_COURSE_RESOURCE_ROUTES,
  listMyCourseResources,
} from "../../../../../../lib/learning/courseResourcesFoundation";
import {
  publishCourseResourceAction,
  upsertCourseResourceAction,
} from "../../../../firstCourseActions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string }> | { courseId: string };
  searchParams?:
    | Promise<{ error?: string; saved?: string; published?: string }>
    | { error?: string; saved?: string; published?: string };
};

export default async function InstructorCourseResourcesPage({
  params,
  searchParams,
}: PageProps) {
  const { courseId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_COURSE_RESOURCE_ROUTES.author(courseId)
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
      subtitle="PDF, ZIP, images, links"
      backHref={`/learning/instructor/courses/${courseId}`}
      backLabel="Course"
    >
      {query.error ? (
        <p role="alert" className="mt-4 text-sm text-rose-100">
          {query.error}
        </p>
      ) : null}
      {query.saved === "1" || query.published === "1" ? (
        <p role="status" className="mt-4 text-sm text-emerald-100">
          {query.published === "1" ? "Published." : "Saved."}
        </p>
      ) : null}

      <form
        action={upsertCourseResourceAction}
        className="mt-6 space-y-3 rounded-2xl border border-white/10 p-4"
      >
        <input type="hidden" name="courseId" value={courseId} />
        <label className="block text-sm text-white/70">
          Title
          <input
            name="title"
            required
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm text-white/70">
          Kind
          <select
            name="resourceKind"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
            defaultValue="pdf"
          >
            {LEARNING_COURSE_RESOURCE_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-white/70">
          URL
          <input
            name="url"
            required
            placeholder="https://..."
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm text-white/70">
          Filename (optional)
          <input
            name="filename"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
          />
        </label>
        <button
          type="submit"
          className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
        >
          Add resource
        </button>
      </form>

      <ul className="mt-6 space-y-3">
        {resources.map((r) => (
          <li
            key={String(r.id)}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 px-4 py-3"
          >
            <div>
              <p className="font-bold text-white">{String(r.title)}</p>
              <p className="text-xs text-white/40">
                {String(r.resource_kind)} · {String(r.status)}
              </p>
            </div>
            {r.status !== "published" ? (
              <form action={publishCourseResourceAction}>
                <input type="hidden" name="courseId" value={courseId} />
                <input type="hidden" name="resourceId" value={String(r.id)} />
                <button
                  type="submit"
                  className="watch-focus-ring rounded-full border border-white/20 px-3 py-1.5 text-sm font-bold text-white"
                >
                  Publish
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </LearningShell>
  );
}
