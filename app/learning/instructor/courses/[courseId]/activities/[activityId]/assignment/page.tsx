import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../../../../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../../../../../lib/supabase/server";
import {
  LEARNING_ASSIGNMENT_ROUTES,
  loadAssignmentForManage,
} from "../../../../../../../../lib/learning/assignmentsCoursework";
import {
  setAssignmentResourcesAction,
  upsertAssignmentSpecAction,
} from "../../../../../../assignmentActions";
import { LEARNING_INSTRUCTOR_ROUTES } from "../../../../../../../../lib/learning/instructorAuthoring";

export const dynamic = "force-dynamic";

type PageProps = {
  params:
 Promise<{ courseId: string; activityId: string }>;
  searchParams?:
 Promise<{ error?: string; saved?: string; resources?: string }>;
};

export default async function InstructorAssignmentAuthorPage({
  params,
  searchParams,
}: PageProps) {
  const { courseId, activityId } = await Promise.resolve(params);
  const query = (await searchParams) ?? {};
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_ASSIGNMENT_ROUTES.author(courseId, activityId)
      )}`
    );
  }

  const supabase = await createClient();
  const loaded = await loadAssignmentForManage(supabase, activityId);
  const resources =
    loaded.ok && Array.isArray(loaded.data.resources)
      ? (loaded.data.resources as Array<{ label: string; url: string }>)
      : [];

  return (
    <LearningShell
      title={
        loaded.ok
          ? String(loaded.data.activity_name ?? "Assignment")
          : "Assignment authoring"
      }
      subtitle="Assignment instructions, due date, resources"
      backHref={LEARNING_INSTRUCTOR_ROUTES.course(courseId)}
      backLabel="Course"
    >
      <p className="mt-3 text-sm">
        <Link
          href={LEARNING_ASSIGNMENT_ROUTES.queue(courseId)}
          className="underline underline-offset-2"
        >
          Submission queue
        </Link>
      </p>

      {query.error ? (
        <p role="alert" className="mt-4 text-sm text-rose-100">
          {query.error}
        </p>
      ) : null}
      {query.saved === "1" || query.resources === "1" ? (
        <p role="status" className="mt-4 text-sm text-emerald-100">
          Saved.
        </p>
      ) : null}

      {!loaded.ok ? (
        <p role="alert" className="mt-6 text-sm text-rose-100">
          {loaded.message}
        </p>
      ) : (
        <div className="mt-6 space-y-8">
          <form action={upsertAssignmentSpecAction} className="space-y-3">
            <input type="hidden" name="activityId" value={activityId} />
            <input type="hidden" name="courseId" value={courseId} />
            <label className="block text-sm text-white/70">
              Instructions
              <textarea
                name="instructions"
                rows={8}
                defaultValue={String(loaded.data.instructions ?? "")}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm text-white/70">
              Due date
              <input
                type="datetime-local"
                name="dueAt"
                defaultValue={
                  loaded.data.due_at
                    ? new Date(String(loaded.data.due_at))
                        .toISOString()
                        .slice(0, 16)
                    : ""
                }
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm text-white/70">
              Maximum submissions (blank = unlimited)
              <input
                type="number"
                min={1}
                name="maxSubmissions"
                defaultValue={
                  loaded.data.max_submissions != null
                    ? String(loaded.data.max_submissions)
                    : ""
                }
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
              />
            </label>
            <button
              type="submit"
              className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
            >
              Save assignment
            </button>
          </form>

          <form action={setAssignmentResourcesAction} className="space-y-3">
            <input type="hidden" name="activityId" value={activityId} />
            <input type="hidden" name="courseId" value={courseId} />
            <h2 className="text-lg font-bold text-white">Reference resources</h2>
            {(resources.length ? resources : [{ label: "", url: "" }]).map(
              (resource, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-2">
                  <input
                    name="resourceLabel"
                    placeholder="Label"
                    defaultValue={resource.label}
                    className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
                  />
                  <input
                    name="resourceUrl"
                    placeholder="https://..."
                    defaultValue={resource.url}
                    className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
                  />
                </div>
              )
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                name="resourceLabel"
                placeholder="New label"
                className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
              />
              <input
                name="resourceUrl"
                placeholder="New https://..."
                className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
              />
            </div>
            <button
              type="submit"
              className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
            >
              Save resources
            </button>
          </form>
        </div>
      )}
    </LearningShell>
  );
}
