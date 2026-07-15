import { Suspense } from "react";
import {
  encodeWatchPageCursor,
  getWatchVideosPageServer,
} from "../../lib/supabase/videoPostsServer";
import { getServerUser } from "../../lib/supabase/server";
import { watchMetadata } from "../../lib/site/routeMetadata";
import ProductEmptyState from "../components/product/ProductEmptyState";
import { demoVideos } from "../data/videos";
import { APP_ROUTES } from "../lib/nav";
import { allowWatchDemoFallback } from "../lib/product/surfaceGates";
import { demoVideoToWatchVideo } from "./lib/mapWatchVideo";
import WatchExperience from "./WatchExperience";

export const metadata = watchMetadata;
export const dynamic = "force-dynamic";

function WatchFallback() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050510] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-blue-600/25 blur-3xl" />
        <div className="absolute right-[-10%] top-[20%] h-96 w-96 rounded-full bg-purple-600/20 blur-3xl" />
      </div>
      <p className="relative rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white/70 backdrop-blur">
        Opening UMTUBA Watch...
      </p>
    </main>
  );
}

type WatchPageProps = {
  searchParams?: Promise<{ post?: string; id?: string }> | { post?: string; id?: string };
};

async function WatchLoader({ searchParams }: WatchPageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  const focusRaw = params.post ?? params.id ?? null;
  const focusPostId = focusRaw ? Number(focusRaw) : NaN;
  const focus =
    Number.isInteger(focusPostId) && focusPostId > 0 ? focusPostId : null;

  const [result, user] = await Promise.all([
    getWatchVideosPageServer({ focusPostId: focus }),
    getServerUser().catch(() => null),
  ]);
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
        eyebrow="Watch"
        title="Watch is unavailable right now"
        description="We couldn’t load videos. Try Discover, or come back in a moment."
        primaryHref={APP_ROUTES.discover}
        primaryLabel="Open Discover"
        secondaryHref={APP_ROUTES.createVideo}
        secondaryLabel="Upload a video"
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
        eyebrow="Watch"
        title="No videos to watch yet"
        description="When creators publish videos, they’ll appear here. Explore Discover or upload your first clip."
        primaryHref={APP_ROUTES.discover}
        primaryLabel="Open Discover"
        secondaryHref={APP_ROUTES.createVideo}
        secondaryLabel="Upload a video"
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

export default function WatchPage(props: WatchPageProps) {
  return (
    <Suspense fallback={<WatchFallback />}>
      <WatchLoader searchParams={props.searchParams} />
    </Suspense>
  );
}
