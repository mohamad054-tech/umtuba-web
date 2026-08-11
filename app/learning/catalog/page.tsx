import Link from "next/link";
import LearningShell from "../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import {
  LEARNING_PUBLIC_ROUTES,
  listPublicCatalogCourses,
} from "../../../lib/learning/publicCatalog";
import { LEARNING_LEARNER_ROUTES } from "../../../lib/learning/learnerDelivery";
import { APP_ROUTES } from "../../lib/nav/routes";

export const metadata = {
  title: "Learning Catalog | UMTUBA",
  description: "Browse free public courses on UMTUBA Learning.",
};

export const dynamic = "force-dynamic";

export default async function LearningPublicCatalogPage() {
  const user = await getServerUser();
  const supabase = await createClient();
  const courses = await listPublicCatalogCourses(supabase);

  return (
    <LearningShell
      title="Learning Catalog"
      subtitle="Public courses"
      backHref={user ? LEARNING_LEARNER_ROUTES.hub : APP_ROUTES.home}
      backLabel={user ? "My Learning" : "Home"}
    >
      <p className="mt-4 text-sm text-white/70">
        Explore published courses. Full lessons require an account and
        enrollment.
      </p>

      {user ? (
        <p className="mt-3 text-sm">
          <Link
            href={LEARNING_LEARNER_ROUTES.hub}
            className="font-bold text-sky-300 underline underline-offset-2 hover:text-sky-200"
          >
            Go to My Learning
          </Link>
        </p>
      ) : (
        <p className="mt-3 text-sm text-white/60">
          <Link
            href={APP_ROUTES.signup}
            className="font-bold text-white underline underline-offset-2"
          >
            Create account
          </Link>
          {" · "}
          <Link
            href={APP_ROUTES.login}
            className="font-bold text-white underline underline-offset-2"
          >
            Log in
          </Link>
        </p>
      )}

      {courses.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/70">
          No public courses are available yet.
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {courses.map((course) => {
            const imageUrl = course.thumbnail_url ?? course.cover_url;
            return (
              <li
                key={course.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]"
              >
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={`${course.name} course cover`}
                    className="h-36 w-full object-cover"
                  />
                ) : null}
                <div className="px-4 py-4">
                  <h2 className="text-lg font-bold text-white">{course.name}</h2>
                  {course.description ? (
                    <p className="mt-2 line-clamp-3 text-sm text-white/70">
                      {course.description}
                    </p>
                  ) : null}
                  <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/55">
                    {course.difficulty ? (
                      <div>
                        <dt className="inline">Level: </dt>
                        <dd className="inline capitalize text-white/80">
                          {course.difficulty}
                        </dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="inline">Modules: </dt>
                      <dd className="inline text-white/80">
                        {course.module_count}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline">Lessons: </dt>
                      <dd className="inline text-white/80">
                        {course.lesson_count}
                      </dd>
                    </div>
                    <div>
                      <dt className="sr-only">Price</dt>
                      <dd className="inline font-semibold text-emerald-300">
                        {course.is_free ? "Free" : "Paid"}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-4">
                    <Link
                      href={LEARNING_PUBLIC_ROUTES.course(course.slug)}
                      className="watch-focus-ring inline-flex rounded-xl bg-white px-4 py-2 text-sm font-bold text-black hover:bg-white/90"
                    >
                      View Course
                    </Link>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </LearningShell>
  );
}
