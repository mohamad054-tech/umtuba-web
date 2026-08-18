import Link from "next/link";
import LearningShell from "../../components/learning/LearningShell";
import CatalogBrowser from "../../components/learning/CatalogBrowser";
import { createTranslator } from "../../../lib/i18n";
import { resolveRequestLocale } from "../../../lib/i18n/server";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import { listPublicCatalogCourses } from "../../../lib/learning/publicCatalog";
import { LEARNING_LEARNER_ROUTES } from "../../../lib/learning/learnerDelivery";
import { APP_ROUTES } from "../../lib/nav/routes";

import { learningCatalogMetadata } from "../../../lib/site/routeMetadata";

export const metadata = learningCatalogMetadata;

export const dynamic = "force-dynamic";

export default async function LearningPublicCatalogPage() {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const user = await getServerUser();
  const supabase = await createClient();
  const courses = await listPublicCatalogCourses(supabase);

  return (
    <LearningShell
      title={t("learning.catalog.title")}
      subtitle={t("learning.catalog.subtitle")}
      backHref={user ? LEARNING_LEARNER_ROUTES.hub : APP_ROUTES.home}
      backLabel={user ? t("learning.catalog.myLearning") : t("learning.catalog.home")}
    >
      <p className="mt-4 text-sm text-white/70">{t("learning.catalog.intro")}</p>

      {user ? (
        <p className="mt-3 text-sm">
          <Link
            href={LEARNING_LEARNER_ROUTES.hub}
            className="font-bold text-sky-300 underline underline-offset-2 hover:text-sky-200"
          >
            {t("learning.catalog.goToMyLearning")}
          </Link>
        </p>
      ) : (
        <p className="mt-3 text-sm text-white/60">
          <Link
            href={APP_ROUTES.signup}
            className="font-bold text-white underline underline-offset-2"
          >
            {t("learning.catalog.createAccount")}
          </Link>
          {" · "}
          <Link
            href={APP_ROUTES.login}
            className="font-bold text-white underline underline-offset-2"
          >
            {t("learning.catalog.logIn")}
          </Link>
        </p>
      )}

      <CatalogBrowser courses={courses} />
    </LearningShell>
  );
}
