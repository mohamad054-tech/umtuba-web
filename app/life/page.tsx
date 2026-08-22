import type { Metadata } from "next";
import { Suspense } from "react";
import {
  getLifePostByIdServer,
  getLifePostsServer,
} from "../../lib/supabase/videoPostsServer";
import JsonLd from "../components/JsonLd";
import { createTranslator } from "../../lib/i18n";
import { resolveRequestLocale } from "../../lib/i18n/server";
import { BRAND } from "../../lib/site/brand";
import { buildSocialMediaPostingJsonLd } from "../../lib/site/jsonLd";
import { buildLocalizedRouteMetadata } from "../../lib/site/localizedSeo";
import { buildPageMetadata, truncateForMeta } from "../../lib/site/metadata";
import { parsePublicPostId } from "../../lib/site/videoSeo";
import ProductLoadingState from "../components/product/ProductLoadingState";
import LifeExperience from "./LifeExperience";
import { mapPublicPostToLifePost } from "./lib/lifePosts";

export const dynamic = "force-dynamic";

type LifeSearchParams = {
  post?: string;
  from?: string;
};

type LifePageProps = {
  searchParams?: Promise<LifeSearchParams> | LifeSearchParams;
};

export async function generateMetadata({
  searchParams,
}: LifePageProps): Promise<Metadata> {
  const { locale } = await resolveRequestLocale();
  const params = await Promise.resolve(searchParams ?? {});
  const focusId = parsePublicPostId(params.post ?? null);
  if (!focusId) {
    return buildLocalizedRouteMetadata({
      key: "life",
      path: "/life",
      locale,
    });
  }

  const result = await getLifePostByIdServer(focusId);
  const focused = result.ok ? mapPublicPostToLifePost(result.post) : null;
  if (!focused) {
    return buildPageMetadata({
      title: "UM Life post",
      description: `This UM Life post is unavailable on ${BRAND.name}.`,
      path: `/life?post=${focusId}`,
      index: "noindex",
      locale,
    });
  }

  const excerpt =
    focused.content.trim() ||
    `A public UM Life post by ${focused.author.name || focused.author.username} on ${BRAND.name}.`;
  return buildPageMetadata({
    title: truncateForMeta(
      focused.content.trim() || `UM Life · ${focused.author.name}`,
      70
    ),
    description: truncateForMeta(excerpt, 160),
    path: `/life?post=${focused.id}`,
    index: "index",
    locale,
    imageUrl: focused.imageUrl,
    imageAlt: focused.author.name
      ? `${focused.author.name} on UM Life`
      : undefined,
  });
}

async function LifeFallback() {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  return <ProductLoadingState fullPage label={t("life.opening")} />;
}

async function LifeLoader({ searchParams }: LifePageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  const focusId = parsePublicPostId(params.post ?? null);

  if (focusId) {
    const result = await getLifePostByIdServer(focusId);
    if (!result.ok) {
      return (
        <LifeExperience
          initialPosts={[]}
          focusedMissing={Boolean(result.notFound)}
          loadError={result.notFound ? null : result.message}
        />
      );
    }
    const focused = mapPublicPostToLifePost(result.post);
    return (
      <>
        <JsonLd
          data={
            focused
              ? buildSocialMediaPostingJsonLd({
                  id: focused.id,
                  content: focused.content,
                  createdAt: focused.createdAt,
                  authorName: focused.author.name,
                  authorUsername: focused.author.username,
                  imageUrl: focused.imageUrl,
                })
              : null
          }
        />
        <LifeExperience
          initialPosts={focused ? [focused] : []}
          focusedPost={focused}
          focusedMissing={!focused}
        />
      </>
    );
  }

  const result = await getLifePostsServer();
  if (!result.ok) {
    return <LifeExperience initialPosts={[]} loadError={result.message} />;
  }

  return (
    <LifeExperience
      initialPosts={result.posts
        .map(mapPublicPostToLifePost)
        .filter((post): post is NonNullable<typeof post> => post != null)}
    />
  );
}

export default function LifePage(props: LifePageProps) {
  return (
    <Suspense fallback={<LifeFallback />}>
      <LifeLoader searchParams={props.searchParams} />
    </Suspense>
  );
}
