import { Suspense } from "react";
import { homeFeedMetadata } from "../lib/site/routeMetadata";
import ProductLoadingState from "./components/product/ProductLoadingState";
import HomeFeedLoader from "./components/home/HomeFeedLoader";

export const metadata = homeFeedMetadata;
export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams?: Promise<{ post?: string; city?: string; comment?: string }>;
};

function HomeFallback() {
  return <ProductLoadingState fullPage label="Opening UMTUBA Home…" />;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = (await searchParams) ?? {};
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeFeedLoader searchParams={params} />
    </Suspense>
  );
}
