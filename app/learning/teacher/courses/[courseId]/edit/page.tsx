import TeacherCourseForm from "../../../../../components/learning/teacher/TeacherCourseForm";
import CourseBuilderView from "../../../../../components/learning/visual/CourseBuilderView";
import { createTranslator } from "../../../../../../lib/i18n";
import { resolveRequestLocale } from "../../../../../../lib/i18n/server";
import type { TranslationKey } from "../../../../../../lib/i18n/messages/types";
import { LEARNING_TEACHER_COURSE_RPCS } from "../../../../../../lib/learning/teacherCourseStudio";
import { updateTeacherCourseAction } from "../../../actions";
import { shouldPreferLiveLearningData } from "../../../../../../lib/learning/productization";

type PageProps = {
  params: Promise<{ courseId: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function TeacherCourseEditPage({
  params,
  searchParams,
}: PageProps) {
  const { courseId } = await params;
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);

  if (!shouldPreferLiveLearningData()) {
    return <CourseBuilderView source="demo_fallback" />;
  }

  const { createClient } = await import("../../../../../../lib/supabase/server");
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("learning_courses")
    .select(
      "id, name, description, category, difficulty, default_language, branding_metadata, ai_metadata"
    )
    .eq("id", courseId)
    .maybeSingle();
  const product = await supabase.rpc(LEARNING_TEACHER_COURSE_RPCS.getProduct, {
    p_course_id: courseId,
  });
  const productRow =
    product.data && typeof product.data === "object"
      ? (product.data as Record<string, unknown>)
      : {};
  const branding =
    course?.branding_metadata && typeof course.branding_metadata === "object"
      ? (course.branding_metadata as Record<string, unknown>)
      : {};
  const ai =
    course?.ai_metadata && typeof course.ai_metadata === "object"
      ? (course.ai_metadata as Record<string, unknown>)
      : {};
  const query = searchParams ? await searchParams : {};

  return (
    <CourseBuilderView
      source="live"
      embedded
      courseForm={
        <>
          <h1 className="text-xl font-black">{t("teacher.courses.edit")}</h1>
          {query.error ? (
            <p role="alert" className="text-sm text-rose-200">
              {t((query.error as TranslationKey) || "teacher.course.error.generic")}
            </p>
          ) : null}
          <TeacherCourseForm
            t={t}
            action={updateTeacherCourseAction}
            submitLabel={t("teacher.course.save")}
            values={{
              course_id: courseId,
              title: course?.name ?? "",
              subtitle:
                typeof productRow.subtitle === "string" ? productRow.subtitle : null,
              description: course?.description ?? null,
              category: course?.category ?? null,
              level: course?.difficulty ?? null,
              language: course?.default_language ?? "ar",
              cover_url:
                typeof branding.cover_url === "string" ? branding.cover_url : null,
              promo_video_url:
                typeof branding.intro_video_url === "string"
                  ? branding.intro_video_url
                  : null,
              learning_objectives: Array.isArray(productRow.learning_objectives)
                ? (productRow.learning_objectives as string[])
                : Array.isArray(ai.outcomes)
                  ? (ai.outcomes as string[])
                  : [],
              prerequisites:
                typeof productRow.prerequisites === "string"
                  ? productRow.prerequisites
                  : null,
              access_kind:
                typeof productRow.access_kind === "string"
                  ? productRow.access_kind
                  : "free",
              future_price_amount_minor:
                typeof productRow.future_price_amount_minor === "number"
                  ? productRow.future_price_amount_minor
                  : null,
              future_price_currency:
                typeof productRow.future_price_currency === "string"
                  ? productRow.future_price_currency
                  : "USD",
            }}
          />
        </>
      }
    />
  );
}
