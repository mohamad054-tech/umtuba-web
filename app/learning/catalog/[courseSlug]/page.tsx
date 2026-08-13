import Link from "next/link";
import { notFound } from "next/navigation";
import LearningShell from "../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import {
  LEARNING_PUBLIC_ROUTES,
  isUserEnrolledInCourse,
  loadPublicCourseBySlug,
} from "../../../../lib/learning/publicCatalog";
import { LEARNING_LEARNER_ROUTES } from "../../../../lib/learning/learnerDelivery";
import { APP_ROUTES } from "../../../lib/nav/routes";
import { enrollInPublicCourseAction } from "../actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseSlug: string }> | { courseSlug: string };
  searchParams?:
    | Promise<{ error?: string }>
    | { error?: string };
};

export async function generateMetadata({ params }: PageProps) {
  const { courseSlug } = await Promise.resolve(params);
  const supabase = await createClient();
  const landing = await loadPublicCourseBySlug(supabase, courseSlug);
  if (!landing) {
    return { title: "Course | Learning Catalog | UMTUBA" };
  }
  return {
    title: `${landing.course.name} | Learning Catalog | UMTUBA`,
    description: landing.course.description ?? undefined,
  };
}

export default async function LearningPublicCourseLandingPage({
  params,
  searchParams,
}: PageProps) {
  const { courseSlug } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  const supabase = await createClient();
  const landing = await loadPublicCourseBySlug(supabase, courseSlug);
  if (!landing) {
    notFound();
  }

  const { course, curriculum, preview } = landing;
  const enrolled = user
    ? await isUserEnrolledInCourse(supabase, course.id, user.id)
    : false;

  const imageUrl = course.cover_url ?? course.thumbnail_url;
  const loginNext = LEARNING_LEARNER_ROUTES.course(course.id);
  const durationLabel =
    course.estimated_duration_minutes != null &&
    course.estimated_duration_minutes > 0
      ? `${Math.round(course.estimated_duration_minutes / 60)} hr`
      : null;

  return (
    <LearningShell
      title="Course"
      subtitle={course.name}
      layout="wide"
      backHref={LEARNING_PUBLIC_ROUTES.catalog}
      backLabel="Catalog"
    >
      {query.error ? (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {query.error}
        </p>
      ) : null}

      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="mt-4 h-48 w-full rounded-[24px] object-cover md:h-64"
        />
      ) : null}

      <header className="mt-6">
        <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
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
              <dt className="inline">Level · </dt>
              <dd className="inline capitalize text-white/90">
                {course.difficulty}
              </dd>
            </div>
          ) : null}
          {durationLabel ? (
            <div>
              <dt className="inline">Duration · </dt>
              <dd className="inline text-white/90">{durationLabel}</dd>
            </div>
          ) : null}
          <div>
            <dt className="inline">Modules · </dt>
            <dd className="inline text-white/90">{course.module_count}</dd>
          </div>
          <div>
            <dt className="inline">Lessons · </dt>
            <dd className="inline text-white/90">{course.lesson_count}</dd>
          </div>
          <div>
            <dt className="sr-only">Price</dt>
            <dd className="inline font-semibold text-emerald-300">
              {course.is_free ? "Free" : "Paid"}
            </dd>
          </div>
        </dl>
      </header>

      {(course.outcomes.length > 0 || course.skills.length > 0) && (
        <section className="mt-8">
          <h2 className="text-base font-bold text-white">What you&apos;ll learn</h2>
          {course.outcomes.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/75">
              {course.outcomes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {course.skills.length > 0 ? (
            <p className="mt-3 text-sm text-white/65">
              Skills: {course.skills.join(" · ")}
            </p>
          ) : null}
        </section>
      )}

      {preview ? (
        <section className="mt-8 rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-200/80">
            Course preview
          </p>
          <h2 className="mt-2 text-lg font-bold text-white">{preview.title}</h2>
          <p className="mt-2 text-sm text-white/80">{preview.summary}</p>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            {preview.body_excerpt}
          </p>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-base font-bold text-white">Curriculum</h2>
        <p className="mt-1 text-sm text-white/55">
          Module and lesson titles only. Full content unlocks after enrollment.
        </p>
        {curriculum.length === 0 ? (
          <p className="mt-4 text-sm text-white/60">Curriculum coming soon.</p>
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
        <h2 className="text-base font-bold text-white">Get started</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {!user ? (
            <>
              <Link
                href={`${APP_ROUTES.signup}?next=${encodeURIComponent(loginNext)}`}
                className="watch-focus-ring inline-flex min-h-11 justify-center rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black hover:bg-white/90"
              >
                Create Account
              </Link>
              <Link
                href={`${APP_ROUTES.login}?next=${encodeURIComponent(loginNext)}`}
                className="watch-focus-ring inline-flex min-h-11 justify-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10"
              >
                Log In to start
              </Link>
            </>
          ) : enrolled ? (
            <Link
              href={LEARNING_LEARNER_ROUTES.course(course.id)}
              className="watch-focus-ring inline-flex min-h-11 justify-center rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black hover:bg-white/90"
            >
              Continue Course
            </Link>
          ) : (
            <form action={enrollInPublicCourseAction}>
              <input type="hidden" name="courseId" value={course.id} />
              <input type="hidden" name="courseSlug" value={course.slug} />
              <button
                type="submit"
                className="watch-focus-ring inline-flex min-h-11 w-full justify-center rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black hover:bg-white/90 sm:w-auto"
              >
                Start Course
              </button>
            </form>
          )}
        </div>
      </section>
    </LearningShell>
  );
}
