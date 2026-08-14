import { Suspense } from "react";
import { redirect } from "next/navigation";
import { homeFeedMetadata } from "../lib/site/routeMetadata";
import { buildHomeCityFocusHref } from "./lib/nav";
import ProductLoadingState from "./components/product/ProductLoadingState";
import HomeFeedLoader from "./components/home/HomeFeedLoader";

export const metadata = homeFeedMetadata;
export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams?:
    | Promise<{ post?: string; city?: string; comment?: string; focus?: string }>
    | { post?: string; city?: string; comment?: string; focus?: string };
};

function HomeFallback() {
  return <ProductLoadingState fullPage label="Opening UMTUBA Home…" />;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  const focus = params.focus?.trim();
  if (focus) {
    redirect(buildHomeCityFocusHref(focus));
  }
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeFeedLoader searchParams={params} />
    </Suspense>
  );
}
