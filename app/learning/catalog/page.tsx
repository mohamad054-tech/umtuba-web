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
      layout="wide"
      backHref={user ? LEARNING_LEARNER_ROUTES.hub : APP_ROUTES.home}
      backLabel={user ? "My Learning" : "Home"}
    >
      <header className="mt-2">
        <h1 className="text-3xl font-black tracking-tight">Find a course</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">
          Explore published courses. Full lessons require an account and
          enrollment.
        </p>
      </header>

      {courses.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/70">
          No public courses are available yet.
        </p>
      ) : (
        <CatalogBrowser courses={courses} />
      )}
    </LearningShell>
  );
}
