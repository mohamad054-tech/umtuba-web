import { redirect } from "next/navigation";
import LearningShell from "../../../../../../../components/learning/LearningShell";
import { getServerUser } from "../../../../../../../../lib/supabase/server";
import { LEARNING_LAB_ROUTES } from "../../../../../../../../lib/learning/labsFoundation";
import { upsertLabSpecAction } from "../../../../../../firstCourseActions";

export const dynamic = "force-dynamic";

type PageProps = {
  params:
 Promise<{ courseId: string; activityId: string }>;
  searchParams?:
 Promise<{ error?: string; saved?: string }>;
};

export default async function InstructorLabAuthorPage({
  params,
  searchParams,
}: PageProps) {
  const { courseId, activityId } = await Promise.resolve(params);
  const query = (await searchParams) ?? {};
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_LAB_ROUTES.author(courseId, activityId)
      )}`
    );
  }

  return (
    <LearningShell
      title="Lab instructions"
      subtitle="Instructor authoring"
      backHref={`/learning/instructor/courses/${courseId}`}
      backLabel="Course"
    >
      {query.error ? (
        <p role="alert" className="mt-4 text-sm text-rose-100">
          {query.error}
        </p>
      ) : null}
      {query.saved === "1" ? (
        <p role="status" className="mt-4 text-sm text-emerald-100">
          Saved.
        </p>
      ) : null}
      <form action={upsertLabSpecAction} className="mt-6 space-y-3">
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="activityId" value={activityId} />
        <label className="block text-sm text-white/70">
          Instructions
          <textarea
            name="instructions"
            rows={10}
            required
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm text-white/70">
          Validation hook (optional)
          <input
            name="validationHook"
            placeholder="hook_name"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
          />
        </label>
        <button
          type="submit"
          className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
        >
          Save lab spec
        </button>
      </form>
    </LearningShell>
  );
}
