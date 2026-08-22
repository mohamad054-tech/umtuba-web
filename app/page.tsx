import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createTranslator } from "../lib/i18n";
import { resolveRequestLocale } from "../lib/i18n/server";
import { buildLocalizedRouteMetadata } from "../lib/site/localizedSeo";
import { buildHomeCityFocusHref } from "./lib/nav";
import ProductLoadingState from "./components/product/ProductLoadingState";
import HomeFeedLoader from "./components/home/HomeFeedLoader";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await resolveRequestLocale();
  return buildLocalizedRouteMetadata({
    key: "home",
    path: "/",
    locale,
    absoluteTitle: true,
  });
}

type HomePageProps = {
  searchParams?:
    | Promise<{ post?: string; city?: string; comment?: string; focus?: string }>
    | { post?: string; city?: string; comment?: string; focus?: string };
};

async function HomeFallback() {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  return <ProductLoadingState fullPage label={t("home.opening")} />;
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
