import { loadLearningHomeSurface } from "../../lib/learning/productization";
import LearningHomeView from "../components/learning/visual/LearningHomeView";
import { learningHubMetadata } from "../../lib/site/routeMetadata";

export const metadata = learningHubMetadata;

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ surface?: string }> | { surface?: string };
};

export default async function LearningHubPage({ searchParams }: PageProps) {
  const query = await Promise.resolve(searchParams ?? {});
  const home = await loadLearningHomeSurface(
    query.surface === "library" ? "library" : "discover"
  );
  return <LearningHomeView home={home} />;
}
