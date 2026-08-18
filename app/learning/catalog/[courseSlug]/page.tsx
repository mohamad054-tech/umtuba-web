import Link from "next/link";
import { notFound } from "next/navigation";
import LearningShell from "../../../components/learning/LearningShell";
import { createTranslator } from "../../../../lib/i18n";
import { resolveRequestLocale } from "../../../../lib/i18n/server";
import type { TranslationKey } from "../../../../lib/i18n/messages/types";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import {
  LEARNING_PUBLIC_ROUTES,
  isUserEnrolledInCourse,
  loadPublicCourseBySlug,
} from "../../../../lib/learning/publicCatalog";
import {
  LEARNING_LEARNER_ROUTES,
  isLearningLessonDeliveryUuid,
} from "../../../../lib/learning/learnerDelivery";
import {
  canUserSelfEnrollInCourse,
  enrollErrorKey,
} from "../../../../lib/learning/publicCatalogSelfEnroll";
import { APP_ROUTES } from "../../../lib/nav/routes";
import { enrollInPublicCourseAction } from "../actions";
import { buildPageMetadata } from "../../../../lib/site/metadata";
import { BRAND } from "../../../../lib/site/brand";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseSlug: string }> | { courseSlug: string };
  searchParams?:
    | Promise<{ error?: string; lesson?: string }>
    | { error?: string; lesson?: string };
};

function difficultyKey(
  difficulty: string
): TranslationKey | null {
  if (difficulty === "beginner") return "learning.difficulty.beginner";
  if (difficulty === "intermediate") return "learning.difficulty.intermediate";
  if (difficulty === "advanced") return "learning.difficulty.advanced";
  if (difficulty === "expert") return "learning.difficulty.expert";
  return null;
}

export async function generateMetadata({ params }: PageProps) {
  const { courseSlug } = await Promise.resolve(params);
  const supabase = await createClient();
  const landing = await loadPublicCourseBySlug(supabase, courseSlug);
  const path = `/learning/catalog/${courseSlug}`;
  if (!landing) {
    return buildPageMetadata({
      title: "Course",
      description: `A ${BRAND.name} Learning course.`,
      path,
      index: "noindex",
    });
  }
  return buildPageMetadata({
    title: landing.course.name,
    description:
      landing.course.description?.trim() ||
      `A public course on ${BRAND.name} Learning.`,
    path,
    index: "index",
  });
}

export default async function LearningPublicCourseLandingPage({
  params,
  searchParams,
}: PageProps) {
  const { courseSlug } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const user = await getServerUser();
  const supabase = await createClient();
  const landing = await loadPublicCourseBySlug(supabase, courseSlug);
  if (!landing) {
    notFound();
  }

  const { course, curriculum, preview } = landing;
  const nextLessonId =
    query.lesson && isLearningLessonDeliveryUuid(query.lesson)
      ? query.lesson
      : "";
  const enrolled = user
    ? await isUserEnrolledInCourse(supabase, course.id, user.id)
    : false;
  const canSelfEnroll =
    user && !enrolled
      ? await canUserSelfEnrollInCourse(supabase, course.id)
      : false;

  const imageUrl = course.cover_url ?? course.thumbnail_url;
  const loginNext = nextLessonId
    ? LEARNING_LEARNER_ROUTES.lesson(nextLessonId)
    : LEARNING_LEARNER_ROUTES.course(course.id);
  const continueHref = nextLessonId
    ? LEARNING_LEARNER_ROUTES.lesson(nextLessonId)
    : LEARNING_LEARNER_ROUTES.course(course.id);
  const durationLabel =
    course.estimated_duration_minutes != null &&
    course.estimated_duration_minutes > 0
      ? t("learning.course.durationHours", {
          values: {
            hours: Math.round(course.estimated_duration_minutes / 60),
          },
        })
      : null;
  const levelKey = course.difficulty ? difficultyKey(course.difficulty) : null;
  const errorKey = query.error ? enrollErrorKey(query.error) : null;

  return (
    <LearningShell
      title={t("learning.course.title")}
      subtitle={course.name}
      backHref={LEARNING_PUBLIC_ROUTES.catalog}
      backLabel={t("learning.course.catalogBack")}
    >
      {errorKey ? (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {t(errorKey)}
        </p>
      ) : null}

      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="mt-6 h-44 w-full rounded-2xl object-cover"
        />
      ) : null}

      <header className="mt-6">
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
          {course.name}
        </h1>
        {course.description ? (
          <p className="mt-3 text-sm leading-relaxed text-white/75">
            {course.description}
          </p>
        ) : null}
        <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/60">
          {course.difficulty ? (
            <div>
              <dt className="inline">{t("learning.course.level")} · </dt>
              <dd className="inline text-white/90">
                {levelKey ? t(levelKey) : course.difficulty}
              </dd>
            </div>
          ) : null}
          {durationLabel ? (
            <div>
              <dd className="inline text-white/90">{durationLabel}</dd>
            </div>
          ) : null}
          <div>
            <dt className="inline">{t("learning.course.modules")} · </dt>
            <dd className="inline text-white/90">{course.module_count}</dd>
          </div>
          <div>
            <dt className="inline">{t("learning.course.lessons")} · </dt>
            <dd className="inline text-white/90">{course.lesson_count}</dd>
          </div>
          <div>
            <dt className="sr-only">{t("learning.catalog.price")}</dt>
            <dd className="inline font-semibold text-emerald-300">
              {course.is_free
                ? t("learning.course.free")
                : t("learning.course.paid")}
            </dd>
          </div>
        </dl>
      </header>

      {(course.outcomes.length > 0 || course.skills.length > 0) && (
        <section className="mt-8">
          <h2 className="text-base font-bold text-white">
            {t("learning.course.whatYouLearn")}
          </h2>
          {course.outcomes.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/75">
              {course.outcomes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {course.skills.length > 0 ? (
            <p className="mt-3 text-sm text-white/65">
              {t("learning.course.skills", {
                values: { skills: course.skills.join(" · ") },
              })}
            </p>
          ) : null}
        </section>
      )}

      {preview ? (
        <section className="mt-8 rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-200/80">
            {t("learning.course.preview")}
          </p>
          <h2 className="mt-2 text-lg font-bold text-white">{preview.title}</h2>
          <p className="mt-2 text-sm text-white/80">{preview.summary}</p>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            {preview.body_excerpt}
          </p>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-base font-bold text-white">
          {t("learning.course.curriculum")}
        </h2>
        <p className="mt-1 text-sm text-white/55">
          {t("learning.course.curriculumHint")}
        </p>
        {curriculum.length === 0 ? (
          <p className="mt-4 text-sm text-white/60">
            {t("learning.course.curriculumEmpty")}
          </p>
        ) : (
          <ol className="mt-4 space-y-4">
            {curriculum.map((mod) => (
              <li
                key={mod.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <h3 className="font-semibold text-white">{mod.name}</h3>
                {mod.lessons.length > 0 ? (
                  <ol className="mt-2 space-y-1 border-l border-white/10 pl-3 text-sm text-white/70">
                    {mod.lessons.map((lesson) => (
                      <li key={lesson.id}>{lesson.name}</li>
                    ))}
                  </ol>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-base font-bold text-white">
          {t("learning.course.getStarted")}
        </h2>
        {user && !enrolled && !canSelfEnroll ? (
          <div
            role="status"
            className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-4 text-sm text-amber-50"
          >
            <p className="font-bold">{t("learning.enroll.restrictedTitle")}</p>
            <p className="mt-2 text-amber-50/85">
              {t("learning.enroll.restrictedBody")}
            </p>
            <p className="mt-2 text-amber-50/70">{t("learning.enroll.typeSelf")}</p>
            <p className="mt-3">
              <Link
                href={LEARNING_PUBLIC_ROUTES.catalog}
                className="underline underline-offset-2 hover:text-white"
              >
                {t("learning.enroll.nextActionCatalog")}
              </Link>
            </p>
          </div>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {!user ? (
            <>
              <Link
                href={`${APP_ROUTES.signup}?next=${encodeURIComponent(loginNext)}`}
                className="watch-focus-ring inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-black hover:bg-white/90"
              >
                {t("learning.course.createAccount")}
              </Link>
              <Link
                href={`${APP_ROUTES.login}?next=${encodeURIComponent(loginNext)}`}
                className="watch-focus-ring inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10"
              >
                {t("learning.course.logIn")}
              </Link>
              <Link
                href={`${APP_ROUTES.login}?next=${encodeURIComponent(loginNext)}`}
                className="watch-focus-ring inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-2.5 text-sm font-bold text-emerald-100 hover:bg-emerald-500/25"
              >
                {t("learning.course.start")}
              </Link>
            </>
          ) : enrolled ? (
            <Link
              href={continueHref}
              className="watch-focus-ring inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-black hover:bg-white/90"
            >
              {t("learning.course.continue")}
            </Link>
          ) : canSelfEnroll ? (
            <form action={enrollInPublicCourseAction}>
              <input type="hidden" name="courseId" value={course.id} />
              <input type="hidden" name="courseSlug" value={course.slug} />
              {nextLessonId ? (
                <input type="hidden" name="nextLessonId" value={nextLessonId} />
              ) : null}
              <button
                type="submit"
                className="watch-focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-black hover:bg-white/90 sm:w-auto"
              >
                {nextLessonId
                  ? t("learning.enroll.enrollAndOpenLesson")
                  : t("learning.course.start")}
              </button>
            </form>
          ) : null}
          <Link
            href={APP_ROUTES.welcome}
            className="watch-focus-ring inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-white/80 hover:bg-white/5"
          >
            {t("learning.course.downloadApp")}
          </Link>
        </div>
        {user ? (
          <p className="text-sm text-white/55">
            <Link
              href={LEARNING_LEARNER_ROUTES.hub}
              className="underline underline-offset-2 hover:text-white"
            >
              {t("learning.course.myLearning")}
            </Link>
          </p>
        ) : null}
      </section>
    </LearningShell>
  );
}
