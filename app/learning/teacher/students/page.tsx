import Link from "next/link";
import { createTranslator } from "../../../../lib/i18n";
import { resolveRequestLocale } from "../../../../lib/i18n/server";
import { createClient } from "../../../../lib/supabase/server";
import { loadTeacherCenterContext } from "../../../../lib/learning/teacherCenterAccess";
import { LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES } from "../../../../lib/learning/instructorExperience";

export default async function TeacherStudentsPage() {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const supabase = await createClient();
  const ctx = await loadTeacherCenterContext(supabase);
  const courses = ctx.dashboard?.courses ?? [];

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-black">{t("teacher.students.title")}</h1>
      {courses.length === 0 ? (
        <p className="text-sm text-white/55">{t("teacher.students.empty")}</p>
      ) : (
        <ul className="space-y-3">
          {courses.map((course) => (
            <li
              key={course.course_id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <Link
                href={LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.learners(course.course_id)}
                className="font-bold hover:underline"
              >
                {course.course_name}
              </Link>
              <p className="mt-1 text-sm text-white/50">
                {course.enrollment_count} · {course.active_learners}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
