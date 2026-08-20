import { Suspense } from "react";
import {
  getLifePostByIdServer,
  getLifePostsServer,
} from "../../lib/supabase/videoPostsServer";
import { lifeMetadata } from "../../lib/site/routeMetadata";
import { parsePublicPostId } from "../../lib/site/videoSeo";
import ProductLoadingState from "../components/product/ProductLoadingState";
import { createTranslator } from "../../lib/i18n";
import { resolveRequestLocale } from "../../lib/i18n/server";
import LifeExperience from "./LifeExperience";
import { mapPublicPostToLifePost } from "./lib/lifePosts";

export const metadata = lifeMetadata;
export const dynamic = "force-dynamic";

type LifeSearchParams = {
  post?: string;
  from?: string;
};

type LifePageProps = {
  searchParams?: Promise<LifeSearchParams> | LifeSearchParams;
};

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
      <LifeExperience
        initialPosts={focused ? [focused] : []}
        focusedPost={focused}
        focusedMissing={!focused}
      />
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
