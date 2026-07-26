import { getServerUser } from "../../../lib/supabase/server";
import {
  encodeWatchPageCursor,
  getDiscoverVideosServer,
} from "../../../lib/supabase/videoPostsServer";
import DiscoverExperience from "../../discover/DiscoverExperience";

type HomeFeedLoaderProps = {
  searchParams?: {
    post?: string;
    city?: string;
    comment?: string;
  };
};

/**
 * Shared Video-First Home feed loader (used by `/` and discover alias).
 * Reuses DiscoverExperience + getDiscoverVideosServer — no second feed stack.
 */
export default async function HomeFeedLoader({
  searchParams = {},
}: HomeFeedLoaderProps) {
  const focusRaw = searchParams.post ?? null;
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
