import { Suspense } from "react";
import type { Metadata } from "next";
import {
  encodeWatchPageCursor,
  getWatchVideosPageServer,
} from "../../lib/supabase/videoPostsServer";
import { getServerUser } from "../../lib/supabase/server";
import { watchMetadata } from "../../lib/site/routeMetadata";
import { getSiteUrl } from "../../lib/site/siteUrl";
import {
  buildVideoObjectJsonLd,
  buildWatchPostMetadata,
  parsePublicPostId,
} from "../../lib/site/videoSeo";
import { loadPublicVideoSeoById } from "../../lib/supabase/publicVideoSeo";
import ProductEmptyState from "../components/product/ProductEmptyState";
import { createTranslator } from "../../lib/i18n";
import { resolveRequestLocale } from "../../lib/i18n/server";
import { demoVideos } from "../data/videos";
import { APP_ROUTES } from "../lib/nav";
import { allowWatchDemoFallback } from "../lib/product/surfaceGates";
import { demoVideoToWatchVideo } from "./lib/mapWatchVideo";
import VideoObjectJsonLdScript from "./VideoObjectJsonLd";
import WatchExperience from "./WatchExperience";

export const dynamic = "force-dynamic";

type WatchSearchParams = {
  post?: string;
  id?: string;
  hl?: string;
};

type WatchPageProps = {
  searchParams?: Promise<WatchSearchParams> | WatchSearchParams;
};

export async function generateMetadata({
  searchParams,
}: WatchPageProps): Promise<Metadata> {
  const params = await Promise.resolve(searchParams ?? {});
  const postId = parsePublicPostId(params.post ?? params.id ?? null);
  if (!postId) {
    return watchMetadata;
  }

  const video = await loadPublicVideoSeoById(postId);
  if (!video) {
    return {
      ...watchMetadata,
      robots: {
        index: false,
        follow: false,
        googleBot: { index: false, follow: false },
      },
    };
  }

  return buildWatchPostMetadata(video);
}

async function WatchFallback() {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050510] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-blue-600/25 blur-3xl" />
        <div className="absolute right-[-10%] top-[20%] h-96 w-96 rounded-full bg-purple-600/20 blur-3xl" />
      </div>
      <p className="relative rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white/70 backdrop-blur">
        {t("watch.opening")}
      </p>
    </main>
  );
}

async function WatchLoader({ searchParams }: WatchPageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  const focusRaw = params.post ?? params.id ?? null;
  const focusPostId = focusRaw ? Number(focusRaw) : NaN;
  const focus =
    Number.isInteger(focusPostId) && focusPostId > 0 ? focusPostId : null;

  const [result, user, localeResult] = await Promise.all([
    getWatchVideosPageServer({ focusPostId: focus }),
    getServerUser().catch(() => null),
    resolveRequestLocale(),
  ]);
  const t = createTranslator(localeResult.locale);
  const initialViewerId = user?.id ?? null;
  const demoAllowed = allowWatchDemoFallback();

  if (!result.ok) {
    if (demoAllowed) {
      return (
        <WatchExperience
          initialVideos={demoVideos.map(demoVideoToWatchVideo)}
          initialCursor={null}
          loadError={result.message}
          usedDemoFallback
          initialViewerId={initialViewerId}
        />
      );
    }

    return (
      <ProductEmptyState
        eyebrow={t("watch.eyebrow")}
        title={t("watch.unavailableTitle")}
        description={t("watch.unavailableBody")}
        primaryHref={APP_ROUTES.discover}
        primaryLabel={t("watch.openDiscover")}
        secondaryHref={APP_ROUTES.createVideo}
        secondaryLabel={t("watch.uploadVideo")}
      />
    );
  }

  if (result.page.videos.length === 0) {
    if (demoAllowed) {
      return (
        <WatchExperience
          initialVideos={demoVideos.map(demoVideoToWatchVideo)}
          initialCursor={null}
          usedDemoFallback
          initialViewerId={initialViewerId}
        />
      );
    }

    return (
      <ProductEmptyState
        eyebrow={t("watch.eyebrow")}
        title={t("watch.emptyTitle")}
        description={t("watch.emptyBody")}
        primaryHref={APP_ROUTES.discover}
        primaryLabel={t("watch.openDiscover")}
        secondaryHref={APP_ROUTES.createVideo}
        secondaryLabel={t("watch.uploadVideo")}
      />
    );
  }

  return (
    <WatchExperience
      initialVideos={result.page.videos}
      initialCursor={encodeWatchPageCursor(result.page.nextCursor)}
      usedDemoFallback={false}
      initialViewerId={initialViewerId}
    />
  );
}

async function WatchSeo({ searchParams }: WatchPageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  const postId = parsePublicPostId(params.post ?? params.id ?? null);
  if (!postId) return null;
  const video = await loadPublicVideoSeoById(postId);
  if (!video) return null;
  return (
    <VideoObjectJsonLdScript
      data={buildVideoObjectJsonLd(video, getSiteUrl())}
    />
  );
}

export default function WatchPage(props: WatchPageProps) {
  return (
    <>
      <WatchSeo searchParams={props.searchParams} />
      <Suspense fallback={<WatchFallback />}>
        <WatchLoader searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
