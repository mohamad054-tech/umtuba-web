import Link from "next/link";
import { createTranslator } from "../../../lib/i18n";
import { resolveRequestLocale } from "../../../lib/i18n/server";
import { createClient } from "../../../lib/supabase/server";
import { loadTeacherCenterContext } from "../../../lib/learning/teacherCenterAccess";
import {
  LEARNING_TEACHER_ROUTES,
  teacherStatusMessageKey,
} from "../../../lib/learning/teacherPlatform";
import { LEARNING_INSTRUCTOR_ROUTES } from "../../../lib/learning/instructorAuthoring";
import { isLearningVisualDemoMode } from "../../../lib/learning/visualDemo";
import TeacherCenterView from "../../components/learning/visual/TeacherCenterView";

export default async function TeacherDashboardPage() {
  if (isLearningVisualDemoMode()) {
    return <TeacherCenterView />;
  }
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const supabase = await createClient();
  const ctx = await loadTeacherCenterContext(supabase);

  if (!ctx.canOperate) {
    return (
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-6">
        <h1 className="text-2xl font-black">{t("teacher.center.gatedTitle")}</h1>
        <p className="mt-2 text-sm text-white/60">{t("teacher.center.gatedBody")}</p>
        {ctx.profile ? (
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-sky-200/80">
            {t(teacherStatusMessageKey(ctx.profile.status))}
          </p>
        ) : null}
        <Link
          href={LEARNING_TEACHER_ROUTES.become}
          className="watch-focus-ring mt-5 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
        >
          {t("teacher.center.applyCta")}
        </Link>
      </section>
    );
  }

  const totals = ctx.dashboard?.totals;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black">{t("teacher.center.nav.dashboard")}</h1>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["teacher.dashboard.courses", totals?.course_count ?? 0],
            ["teacher.dashboard.students", totals?.enrollment_count ?? 0],
            ["teacher.dashboard.reviews", totals?.pending_reviews ?? 0],
            ["teacher.dashboard.completions", totals?.completion_count ?? 0],
          ] as const
        ).map(([key, value]) => (
          <div
            key={key}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <dt className="text-xs uppercase tracking-wide text-white/40">{t(key)}</dt>
            <dd className="mt-1 text-2xl font-black">{value}</dd>
          </div>
        ))}
      </dl>
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{t("teacher.courses.title")}</h2>
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
          <p className="mt-3 text-sm text-white/55">{t("teacher.dashboard.empty")}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {ctx.dashboard?.courses.map((course) => (
              <li
                key={course.course_id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <Link
                  href={LEARNING_TEACHER_ROUTES.course(course.course_id)}
                  className="text-lg font-bold hover:underline"
                >
                  {course.course_name}
                </Link>
                <p className="mt-1 text-xs uppercase tracking-wide text-white/40">
                  {course.course_status}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Link
        href={LEARNING_INSTRUCTOR_ROUTES.hub}
        className="text-sm font-bold text-sky-300 hover:underline"
      >
        {t("teacher.center.legacyInstructor")}
      </Link>
    </div>
  );
}
