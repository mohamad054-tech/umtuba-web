import Link from "next/link";
import TeacherCourseForm from "../../../../components/learning/teacher/TeacherCourseForm";
import { createTranslator } from "../../../../../lib/i18n";
import { resolveRequestLocale } from "../../../../../lib/i18n/server";
import type { TranslationKey } from "../../../../../lib/i18n/messages/types";
import { createClient } from "../../../../../lib/supabase/server";
import { loadTeacherCenterContext } from "../../../../../lib/learning/teacherCenterAccess";
import { LEARNING_TEACHER_ROUTES } from "../../../../../lib/learning/teacherPlatform";
import { createTeacherCourseAction } from "../../actions";
import { isLearningVisualDemoMode } from "../../../../../lib/learning/visualDemo";
import CourseBuilderView from "../../../../components/learning/visual/CourseBuilderView";

type PageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function TeacherCreateCoursePage({ searchParams }: PageProps) {
  if (isLearningVisualDemoMode()) {
    return <CourseBuilderView />;
  }
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const supabase = await createClient();
  const ctx = await loadTeacherCenterContext(supabase);
  const params = searchParams ? await searchParams : {};

  if (!ctx.approved) {
    return (
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-6">
        <h1 className="text-2xl font-black">{t("teacher.course.notApproved")}</h1>
        <Link
          href={LEARNING_TEACHER_ROUTES.become}
          className="watch-focus-ring mt-4 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
        >
          {t("teacher.center.applyCta")}
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-black">{t("teacher.center.nav.create")}</h1>
      {params.error ? (
        <p role="alert" className="text-sm text-rose-200">
          {t((params.error as TranslationKey) || "teacher.course.error.generic")}
        </p>
      ) : null}
      <TeacherCourseForm
        t={t}
        action={createTeacherCourseAction}
        submitLabel={t("teacher.course.create")}
      />
    </section>
  );
}
