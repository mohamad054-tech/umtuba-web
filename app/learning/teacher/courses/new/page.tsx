import Link from "next/link";
import TeacherCourseForm from "../../../../components/learning/teacher/TeacherCourseForm";
import CourseBuilderView from "../../../../components/learning/visual/CourseBuilderView";
import { createTranslator } from "../../../../../lib/i18n";
import { resolveRequestLocale } from "../../../../../lib/i18n/server";
import type { TranslationKey } from "../../../../../lib/i18n/messages/types";
import { LEARNING_TEACHER_ROUTES } from "../../../../../lib/learning/teacherPlatform";
import { createTeacherCourseAction } from "../../actions";
import {
  shouldPreferLiveLearningData,
} from "../../../../../lib/learning/productization";

type PageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function TeacherCreateCoursePage({ searchParams }: PageProps) {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const params = searchParams ? await searchParams : {};

  if (!shouldPreferLiveLearningData()) {
    return <CourseBuilderView source="demo_fallback" />;
  }

  const { createClient } = await import("../../../../../lib/supabase/server");
  const { loadTeacherCenterContext } = await import(
    "../../../../../lib/learning/teacherCenterAccess"
  );
  const supabase = await createClient();
  const ctx = await loadTeacherCenterContext(supabase);

  if (!ctx.approved) {
    return (
      <CourseBuilderView
        source="live"
        embedded
        courseForm={
          <section>
            <h1 className="text-2xl font-black">{t("teacher.course.notApproved")}</h1>
            <Link
              href={LEARNING_TEACHER_ROUTES.become}
              className="watch-focus-ring mt-4 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
            >
              {t("teacher.center.applyCta")}
            </Link>
          </section>
        }
      />
    );
  }

  return (
    <CourseBuilderView
      source="live"
      embedded
      courseForm={
        <>
          <h1 className="text-xl font-black">{t("teacher.center.nav.create")}</h1>
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
        </>
      }
    />
  );
}
