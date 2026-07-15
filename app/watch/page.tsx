import { Suspense } from "react";
import {
  encodeWatchPageCursor,
  getWatchVideosPageServer,
} from "../../lib/supabase/videoPostsServer";
import { demoVideos } from "../data/videos";
import { demoVideoToWatchVideo } from "./lib/mapWatchVideo";
import WatchExperience from "./WatchExperience";

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

  const result = await getWatchVideosPageServer({ focusPostId: focus });

  if (!result.ok) {
    return (
      <WatchExperience
        initialVideos={demoVideos.map(demoVideoToWatchVideo)}
        initialCursor={null}
        loadError={result.message}
        usedDemoFallback
      />
    );
  }

  if (result.page.videos.length === 0) {
    return (
      <WatchExperience
        initialVideos={demoVideos.map(demoVideoToWatchVideo)}
        initialCursor={null}
        usedDemoFallback
      />
    );
  }

  return (
    <WatchExperience
      initialVideos={result.page.videos}
      initialCursor={encodeWatchPageCursor(result.page.nextCursor)}
      usedDemoFallback={false}
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
