import { LEARNING_PUBLIC_ROUTES } from "../../../lib/learning/publicCatalog";
import { loadLearningHomeSurface } from "../../../lib/learning/productization";
import { resolveRequestLocale } from "../../../lib/i18n/server";
import { buildLocalizedRouteMetadata } from "../../../lib/site/localizedSeo";
import LearningHomeView from "../../components/learning/visual/LearningHomeView";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { locale } = await resolveRequestLocale();
  return buildLocalizedRouteMetadata({
    key: "learningCatalog",
    path: LEARNING_PUBLIC_ROUTES.catalog,
    locale,
  });
}

export default async function LearningPublicCatalogPage() {
  const home = await loadLearningHomeSurface("discover");
  return <LearningHomeView home={home} />;
}
