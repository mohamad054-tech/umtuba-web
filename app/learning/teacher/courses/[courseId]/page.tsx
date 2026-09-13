import Link from "next/link";
import { createTranslator } from "../../../../../lib/i18n";
import { resolveRequestLocale } from "../../../../../lib/i18n/server";
import { createClient } from "../../../../../lib/supabase/server";
import { LEARNING_TEACHER_ROUTES } from "../../../../../lib/learning/teacherPlatform";
import { LEARNING_INSTRUCTOR_ROUTES } from "../../../../../lib/learning/instructorAuthoring";
import { LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES } from "../../../../../lib/learning/instructorExperience";
import { LEARNING_COURSE_RESOURCE_ROUTES } from "../../../../../lib/learning/courseResourcesFoundation";

type PageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function TeacherCoursePage({ params }: PageProps) {
  const { courseId } = await params;
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const supabase = await createClient();
  const { data } = await supabase
    .from("learning_courses")
    .select("id, name, status, visibility")
    .eq("id", courseId)
    .maybeSingle();

  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-black">{data?.name ?? t("teacher.courses.title")}</h1>
      <p className="text-xs uppercase tracking-wide text-white/40">
        {data?.status} · {data?.visibility}
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href={LEARNING_TEACHER_ROUTES.courseEdit(courseId)}
          className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
        >
          {t("teacher.courses.edit")}
        </Link>
        <Link
          href={LEARNING_INSTRUCTOR_ROUTES.course(courseId)}
          className="watch-focus-ring rounded-full border border-white/20 px-4 py-2 text-sm font-bold"
        >
          {t("teacher.course.authoring")}
        </Link>
        <Link
          href={LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.learners(courseId)}
          className="watch-focus-ring rounded-full border border-white/20 px-4 py-2 text-sm font-bold"
        >
          {t("teacher.center.nav.students")}
        </Link>
        <Link
          href={LEARNING_COURSE_RESOURCE_ROUTES.author(courseId)}
          className="watch-focus-ring rounded-full border border-white/20 px-4 py-2 text-sm font-bold"
        >
          {t("teacher.course.resources")}
        </Link>
        <Link
          href={LEARNING_INSTRUCTOR_ROUTES.course(courseId)}
          className="watch-focus-ring rounded-full border border-white/20 px-4 py-2 text-sm font-bold"
        >
          {t("teacher.course.quiz")}
        </Link>
      </div>
    </section>
  );
}
