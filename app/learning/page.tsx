import { redirect } from "next/navigation";
import LearningShell from "../components/learning/LearningShell";
import LearningHub from "../components/learning/LearningHub";
import { createTranslator } from "../../lib/i18n";
import { resolveRequestLocale } from "../../lib/i18n/server";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { loadMyLearningHub } from "../../lib/learning/learnerDelivery";
import { LEARNING_PUBLIC_ROUTES } from "../../lib/learning/publicCatalog";
import {
  LEARNING_INSTRUCTOR_ROUTES,
  listInstructorAuthorableCourses,
  type InstructorAuthorableCourse,
} from "../../lib/learning/instructorAuthoring";

import { learningHubMetadata } from "../../lib/site/routeMetadata";

export const metadata = learningHubMetadata;

export const dynamic = "force-dynamic";

export default async function LearningHubPage() {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const user = await getServerUser();
  const viewerId = user?.id ?? "";
  if (!viewerId) {
    redirect(LEARNING_PUBLIC_ROUTES.catalog);
  }

  const supabase = await createClient();
  const hub = await loadMyLearningHub(supabase, viewerId);
  const authorable = await listInstructorAuthorableCourses(supabase);
  const showInstructor =
    authorable.ok &&
    (authorable.data as InstructorAuthorableCourse[]).length > 0;

  return (
    <LearningShell
      title={t("learning.hub.title")}
      subtitle={t("learning.hub.subtitle")}
      instructorHref={
        showInstructor ? LEARNING_INSTRUCTOR_ROUTES.hub : undefined
      }
    >
      {hub.ok ? (
        <LearningHub hub={hub.data} />
      ) : (
        <div
          role="alert"
          className="mt-6 rounded-[28px] border border-rose-400/25 bg-rose-500/10 px-4 py-5 text-sm text-rose-100"
        >
          <p className="font-black">{t("learning.hub.loadError")}</p>
          <p className="mt-2 text-rose-50/85">{hub.message}</p>
        </div>
      )}
    </LearningShell>
  );
}
