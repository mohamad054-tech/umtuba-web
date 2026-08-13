import { redirect, notFound } from "next/navigation";
import LearningShell from "../../../components/learning/LearningShell";
import CourseOutline from "../../../components/learning/CourseOutline";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import {
  LEARNING_LEARNER_ROUTES,
  loadCourseOutline,
} from "../../../../lib/learning/learnerDelivery";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string }> | { courseId: string };
};

export async function generateMetadata({ params }: PageProps) {
  const { courseId } = await Promise.resolve(params);
  return { title: `Course · Learning | UMTUBA` };
}

export default async function LearningCoursePage({ params }: PageProps) {
  const { courseId } = await Promise.resolve(params);
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_LEARNER_ROUTES.course(courseId))}`
    );
  }

  const supabase = await createClient();
  const outline = await loadCourseOutline(supabase, courseId);
  if (!outline.ok) {
    notFound();
  }

  return (
    <LearningShell
      title="Course"
      subtitle={outline.data.course.name}
      layout="wide"
      backHref={LEARNING_LEARNER_ROUTES.hub}
      backLabel="My Learning"
    >
      <CourseOutline outline={outline.data} />
    </LearningShell>
  );
}
