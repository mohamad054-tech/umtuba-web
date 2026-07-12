import { Suspense } from "react";
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

export default async function CityPage({ params }: CityPageProps) {
  const { citySlug } = await params;
  const slug = decodeURIComponent(citySlug || "city");

  return (
    <Suspense fallback={<CityFallback />}>
      <CityExperience citySlug={slug} />
    </Suspense>
  );
}
