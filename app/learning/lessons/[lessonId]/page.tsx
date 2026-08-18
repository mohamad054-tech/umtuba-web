import LearningShell from "../../../components/learning/LearningShell";
import LessonViewer from "../../../components/learning/LessonViewer";
import ProductEmptyState from "../../../components/product/ProductEmptyState";
import { createTranslator } from "../../../../lib/i18n";
import { resolveRequestLocale } from "../../../../lib/i18n/server";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import {
  LEARNING_LEARNER_ROUTES,
  classifyLessonDeliveryFailure,
  isLearningLessonDeliveryUuid,
  loadLessonDelivery,
} from "../../../../lib/learning/learnerDelivery";
import { loadMyLearningLessonEngine } from "../../../../lib/learning/lessonEngineFoundation";
import {
  LEARNING_PUBLIC_ROUTES,
  loadPublicLessonAccessContext,
  resolvePublicLessonSafeHref,
  type PublicLessonAccessContext,
} from "../../../../lib/learning/publicCatalog";
import { canUserSelfEnrollInCourse } from "../../../../lib/learning/publicCatalogSelfEnroll";
import { enrollInPublicCourseAction } from "../../catalog/actions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lessonId: string }> | { lessonId: string };
  searchParams?:
    | Promise<{ error?: string; completed?: string; unlocked?: string }>
    | { error?: string; completed?: string; unlocked?: string };
};

export async function generateMetadata({ params }: PageProps) {
  const { lessonId } = await Promise.resolve(params);
  void lessonId;
  return { title: `Lesson · Learning | UMTUBA` };
}

async function renderLessonAccessState(
  kind: "unavailable" | "error",
  context: PublicLessonAccessContext | null
) {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const courseHref = resolvePublicLessonSafeHref(context);
  return (
    <LearningShell
      title={t("nav.learning")}
      subtitle={context?.lesson_name ?? t("nav.learning")}
      backHref={LEARNING_PUBLIC_ROUTES.catalog}
      backLabel={t("learning.lesson.returnToCatalog")}
    >
      <div className="mt-8 flex justify-center">
        <ProductEmptyState
          compact
          eyebrow={t("nav.learning")}
          title={
            kind === "error"
              ? t("learning.lesson.errorTitle")
              : t("learning.lesson.unavailableTitle")
          }
          description={
            kind === "error"
              ? t("learning.lesson.errorBody")
              : t("learning.lesson.unavailableBody")
          }
          primaryHref={courseHref}
          primaryLabel={
            context
              ? t("learning.lesson.returnToCourse")
              : t("learning.lesson.returnToCatalog")
          }
          secondaryHref={LEARNING_LEARNER_ROUTES.hub}
          secondaryLabel={t("learning.lesson.returnToLearning")}
        />
      </div>
    </LearningShell>
  );
}

async function renderEnrollmentRequired(
  context: PublicLessonAccessContext,
  canSelfEnroll: boolean
) {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  return (
    <LearningShell
      title={t("learning.lesson.title")}
      subtitle={context.lesson_name}
      backHref={resolvePublicLessonSafeHref(context)}
      backLabel={t("learning.lesson.returnToCourse")}
    >
      <section className="mt-8 rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-200/80">
          {context.course_name}
        </p>
        <h1 className="mt-2 text-xl font-bold text-white">
          {canSelfEnroll
            ? t("learning.enroll.requiredTitle")
            : t("learning.enroll.restrictedTitle")}
        </h1>
        <p className="mt-2 text-sm text-white/75">
          {canSelfEnroll
            ? t("learning.enroll.requiredBody")
            : t("learning.enroll.restrictedBody")}
        </p>
        <p className="mt-2 text-sm text-white/55">{t("learning.enroll.typeSelf")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {canSelfEnroll ? (
            <form action={enrollInPublicCourseAction}>
              <input type="hidden" name="courseId" value={context.course_id} />
              <input type="hidden" name="courseSlug" value={context.course_slug} />
              <input type="hidden" name="nextLessonId" value={context.lesson_id} />
              <button
                type="submit"
                className="watch-focus-ring inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-black hover:bg-white/90"
              >
                {t("learning.enroll.enrollAndOpenLesson")}
              </button>
            </form>
          ) : (
            <a
              href={LEARNING_PUBLIC_ROUTES.catalog}
              className="watch-focus-ring inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10"
            >
              {t("learning.enroll.nextActionCatalog")}
            </a>
          )}
        </div>
      </section>
    </LearningShell>
  );
}

export default async function LearningLessonPage({
  params,
  searchParams,
}: PageProps) {
  const { lessonId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const supabase = await createClient();
  const publicContext = isLearningLessonDeliveryUuid(lessonId)
    ? await loadPublicLessonAccessContext(supabase, lessonId)
    : null;

  const user = await getServerUser();
  if (!user) {
    // Guests: public course landing when the lesson is catalog-visible.
    // Never login-deep-link, and never load content blocks.
    redirect(resolvePublicLessonSafeHref(publicContext));
  }

  if (!isLearningLessonDeliveryUuid(lessonId)) {
    return renderLessonAccessState("unavailable", null);
  }

  const [delivery, engineResult] = await Promise.all([
    loadLessonDelivery(supabase, lessonId),
    loadMyLearningLessonEngine(supabase, lessonId),
  ]);
  if (!delivery.ok) {
    const kind = classifyLessonDeliveryFailure(delivery.message);
    if (kind === "unavailable" && publicContext) {
      const canSelfEnroll = await canUserSelfEnrollInCourse(
        supabase,
        publicContext.course_id
      );
      return renderEnrollmentRequired(publicContext, canSelfEnroll);
    }
    return renderLessonAccessState(kind, publicContext);
  }

  return (
    <LearningShell
      title={t("learning.lesson.title")}
      subtitle={delivery.data.lesson.name}
      backHref={LEARNING_LEARNER_ROUTES.course(delivery.data.lesson.course_id)}
      backLabel={t("learning.lesson.courseOutline")}
    >
      {query.completed === "1" ? (
        <p
          role="status"
          className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50"
        >
          {t("learning.lesson.markedComplete")}
        </p>
      ) : null}

      {query.unlocked === "1" ? (
        <p
          role="status"
          className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50"
        >
          {t("learning.lesson.unlockedPoints")}
        </p>
      ) : null}

      {query.error ? (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {query.error}
        </p>
      ) : null}

      <LessonViewer
        delivery={delivery.data}
        engine={engineResult.ok ? engineResult.data : null}
      />
    </LearningShell>
  );
}
