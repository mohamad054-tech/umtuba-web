import Link from "next/link";
import { createTranslator } from "../../../../lib/i18n";
import { resolveRequestLocale } from "../../../../lib/i18n/server";
import { createClient } from "../../../../lib/supabase/server";
import { loadTeacherCenterContext } from "../../../../lib/learning/teacherCenterAccess";
import { LEARNING_TEACHER_ROUTES } from "../../../../lib/learning/teacherPlatform";

export default async function TeacherCoursesPage() {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const supabase = await createClient();
  const ctx = await loadTeacherCenterContext(supabase);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">{t("teacher.courses.title")}</h1>
        {ctx.approved ? (
          <Link
            href={LEARNING_TEACHER_ROUTES.courseNew}
            className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
          >
            {t("teacher.courses.create")}
          </Link>
        ) : null}
      </div>
      {(ctx.dashboard?.courses.length ?? 0) === 0 ? (
        <p className="text-sm text-white/55">{t("teacher.courses.empty")}</p>
      ) : (
        <ul className="space-y-3">
          {ctx.dashboard?.courses.map((course) => (
            <li
              key={course.course_id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                  href={LEARNING_TEACHER_ROUTES.course(course.course_id)}
                  className="text-lg font-bold hover:underline"
                >
                  {course.course_name}
                </Link>
                <Link
                  href={LEARNING_TEACHER_ROUTES.courseEdit(course.course_id)}
                  className="text-sm font-bold text-sky-300 hover:underline"
                >
                  {t("teacher.courses.edit")}
                </Link>
              </div>
              <p className="mt-1 text-xs uppercase text-white/40">
                {course.course_status} · {course.enrollment_count}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
