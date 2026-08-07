import { redirect } from "next/navigation";
import Link from "next/link";
import LearningShell from "../components/learning/LearningShell";
import LearningHub from "../components/learning/LearningHub";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  LEARNING_LEARNER_ROUTES,
  loadMyLearningHub,
} from "../../lib/learning/learnerDelivery";
import {
  LEARNING_INSTRUCTOR_ROUTES,
  listInstructorAuthorableCourses,
  type InstructorAuthorableCourse,
} from "../../lib/learning/instructorAuthoring";
import { LEARNING_COMPLETION_ROUTES } from "../../lib/learning/completionFoundation";

export const metadata = {
  title: "My Learning | UMTUBA",
};

export const dynamic = "force-dynamic";

export default async function LearningHubPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_LEARNER_ROUTES.hub)}`
    );
  }

  const supabase = await createClient();
  const hub = await loadMyLearningHub(supabase, user.id);
  const authorable = await listInstructorAuthorableCourses(supabase);
  const showInstructor =
    authorable.ok &&
    (authorable.data as InstructorAuthorableCourse[]).length > 0;

  return (
    <LearningShell
      title="Learning"
      subtitle="My Learning"
      instructorHref={
        showInstructor ? LEARNING_INSTRUCTOR_ROUTES.hub : undefined
      }
    >
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link
          href={LEARNING_COMPLETION_ROUTES.transcript}
          className="font-bold text-white underline underline-offset-2"
        >
          View transcript &amp; certificates
        </Link>
        <Link
          href={LEARNING_LEARNER_ROUTES.notes}
          className="font-bold text-white underline underline-offset-2"
          data-testid="learning-hub-notes-link"
        >
          My notes
        </Link>
      </p>
      {hub.ok ? (
        <LearningHub hub={hub.data} />
      ) : (
        <p
          role="alert"
          className="mt-6 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {hub.message}
        </p>
      )}
    </LearningShell>
  );
}
