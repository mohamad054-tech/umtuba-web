import Link from "next/link";
import LearningShell from "../../components/learning/LearningShell";
import CatalogBrowser from "../../components/learning/CatalogBrowser";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import { listPublicCatalogCourses } from "../../../lib/learning/publicCatalog";
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

      <CatalogBrowser courses={courses} />
    </LearningShell>
  );
}
