import { Suspense } from "react";
import { discoverMetadata } from "../../lib/site/routeMetadata";
import { getServerUser } from "../../lib/supabase/server";
import {
  encodeWatchPageCursor,
  getDiscoverVideosServer,
} from "../../lib/supabase/videoPostsServer";
import DiscoverExperience from "./DiscoverExperience";

export const metadata = discoverMetadata;
export const dynamic = "force-dynamic";

function DiscoverFallback() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050510] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-blue-600/25 blur-3xl" />
        <div className="absolute right-[-10%] top-[20%] h-96 w-96 rounded-full bg-sky-500/15 blur-3xl" />
      </div>
      <p
        className="relative rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white/70 backdrop-blur"
        role="status"
      >
        Opening UMTUBA Discover...
      </p>
    </main>
  );
}

type DiscoverPageProps = {
  searchParams?:
    | Promise<{ post?: string; city?: string; comment?: string }>
    | { post?: string; city?: string; comment?: string };
};

async function DiscoverLoader({ searchParams }: DiscoverPageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  const focusRaw = params.post ?? null;
  const focusPostId = focusRaw ? Number(focusRaw) : NaN;
  const focus =
    Number.isInteger(focusPostId) && focusPostId > 0 ? focusPostId : null;

  const [user, result] = await Promise.all([
    getServerUser().catch(() => null),
    getDiscoverVideosServer({ focusPostId: focus }),
  ]);
  const initialViewerId = user?.id ?? null;

  if (!result.ok) {
    return (
      <DiscoverExperience
        videos={[]}
        initialCursor={null}
        loadError={result.message}
        initialViewerId={initialViewerId}
      />
    );
  }

  return (
    <DiscoverExperience
      videos={result.videos}
      initialCursor={encodeWatchPageCursor(result.nextCursor)}
      initialViewerId={initialViewerId}
    />
  );
}

export default function DiscoverPage(props: DiscoverPageProps) {
  return (
    <Suspense fallback={<DiscoverFallback />}>
      <DiscoverLoader searchParams={props.searchParams} />
    </Suspense>
  );
}
