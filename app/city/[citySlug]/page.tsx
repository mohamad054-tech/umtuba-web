import { Suspense } from "react";
import ProductEmptyState from "../../components/product/ProductEmptyState";
import { APP_ROUTES, buildDiscoverCityHref } from "../../lib/nav";
import { isExperimentalRouteAvailable } from "../../lib/product/surfaceGates";
import CityExperience from "./CityExperience";

type CityPageProps = {
  params: Promise<{ citySlug: string }>;
};

function CityFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050510] text-white">
      <p className="text-sm text-white/50">Opening city...</p>
    </main>
  );
}

/**
 * City prototype — full placeholder UI in development only.
 * Production: transparent “being prepared” state (no fake city data).
 */
export default async function CityPage({ params }: CityPageProps) {
  const { citySlug } = await params;
  const slug = decodeURIComponent(citySlug || "city");

  if (!isExperimentalRouteAvailable()) {
    const label = slug.replace(/-/g, " ");
    return (
      <ProductEmptyState
        eyebrow="City"
        title="City experience is being prepared"
        description={`We’re building a real city view for ${label}. Meanwhile, explore creators and videos in Discover.`}
        primaryHref={buildDiscoverCityHref(label)}
        primaryLabel="Explore in Discover"
        secondaryHref={APP_ROUTES.live}
        secondaryLabel="Browse Live"
      />
    );
  }

  return (
    <Suspense fallback={<CityFallback />}>
      <CityExperience citySlug={slug} />
    </Suspense>
  );
}
