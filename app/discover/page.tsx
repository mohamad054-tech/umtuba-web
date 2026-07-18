import { Suspense } from "react";
import { discoverMetadata } from "../../lib/site/routeMetadata";
import { getServerUser } from "../../lib/supabase/server";
import {
  encodeWatchPageCursor,
  getDiscoverVideosServer,
} from "../../lib/supabase/videoPostsServer";
import ProductLoadingState from "../components/product/ProductLoadingState";
import DiscoverExperience from "./DiscoverExperience";

export const metadata = discoverMetadata;
export const dynamic = "force-dynamic";

function DiscoverFallback() {
  return <ProductLoadingState fullPage label="Opening UMTUBA Discover…" />;
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
