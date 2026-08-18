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

export default async function LearningLessonPage({
  params,
  searchParams,
}: PageProps) {
  const { lessonId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
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
    return renderLessonAccessState(
      classifyLessonDeliveryFailure(delivery.message),
      publicContext
    );
  }

  return (
    <LearningShell
      title="Lesson"
      subtitle={delivery.data.lesson.name}
      backHref={LEARNING_LEARNER_ROUTES.course(delivery.data.lesson.course_id)}
      backLabel="Course outline"
    >
      {query.completed === "1" ? (
        <p
          role="status"
          className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50"
        >
          Lesson marked complete.
        </p>
      ) : null}

      {query.unlocked === "1" ? (
        <p
          role="status"
          className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50"
        >
          Lesson unlocked with UM Points.
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
