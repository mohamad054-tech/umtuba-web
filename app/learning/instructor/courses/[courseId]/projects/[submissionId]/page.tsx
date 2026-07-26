import { redirect } from "next/navigation";
import LearningShell from "../../../../../../components/learning/LearningShell";
import { getServerUser } from "../../../../../../../lib/supabase/server";
import { LEARNING_PROJECT_ROUTES } from "../../../../../../../lib/learning/projectsFoundation";
import { reviewProjectSubmissionAction } from "../../../../../firstCourseActions";

export const dynamic = "force-dynamic";

type PageProps = {
  params:
    | Promise<{ courseId: string; submissionId: string }>
    | { courseId: string; submissionId: string };
  searchParams?:
    | Promise<{ error?: string; reviewed?: string }>
    | { error?: string; reviewed?: string };
};

export default async function InstructorProjectReviewPage({
  params,
  searchParams,
}: PageProps) {
  const { courseId, submissionId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_PROJECT_ROUTES.review(courseId, submissionId)
      )}`
    );
  }

  return (
    <LearningShell
      title="Review project"
      subtitle="Approve or request changes"
      backHref={`/learning/instructor/courses/${courseId}`}
      backLabel="Course"
    >
      {query.error ? (
        <p role="alert" className="mt-4 text-sm text-rose-100">
          {query.error}
        </p>
      ) : null}
      {query.reviewed === "1" ? (
        <p role="status" className="mt-4 text-sm text-emerald-100">
          Review saved.
        </p>
      ) : null}

      <form action={reviewProjectSubmissionAction} className="mt-6 space-y-3">
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="submissionId" value={submissionId} />
        <label className="block text-sm text-white/70">
          Status
          <select
            name="status"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
            defaultValue="approved"
          >
            <option value="approved">approved</option>
            <option value="needs_changes">needs_changes</option>
          </select>
        </label>
        <label className="block text-sm text-white/70">
          Feedback
          <textarea
            name="feedback"
            rows={6}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
          />
        </label>
        <button
          type="submit"
          className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
        >
          Submit review
        </button>
      </form>
    </LearningShell>
  );
}
