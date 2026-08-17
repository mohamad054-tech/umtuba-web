import { Suspense } from "react";
import { redirect } from "next/navigation";
import { followingMetadata } from "../../lib/site/routeMetadata";
import {
  encodeFollowingPageCursor,
  loadFollowingVideoFeedPage,
} from "../../lib/supabase/followingFeed";
import { getServerUser } from "../../lib/supabase/server";
import ProductLoadingState from "../components/product/ProductLoadingState";
import { APP_ROUTES } from "../lib/nav";
import FollowingExperience from "./FollowingExperience";

export const metadata = followingMetadata;
export const dynamic = "force-dynamic";

function FollowingFallback() {
  return <ProductLoadingState fullPage label="Opening Following…" />;
}

async function FollowingLoader() {
  const user = await getServerUser().catch(() => null);
  if (!user?.id) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.following)}`
    );
  }

  const result = await loadFollowingVideoFeedPage();

  if (!result.ok) {
    if (result.requiresAuth) {
      redirect(
        `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.following)}`
      );
    }
    return (
      <FollowingExperience
        videos={[]}
        initialCursor={null}
        loadError={result.message}
        initialViewerId={user.id}
        followedCount={0}
      />
    );
  }

  return (
    <FollowingExperience
      videos={result.page.videos}
      initialCursor={encodeFollowingPageCursor(result.page.nextCursor)}
      initialViewerId={user.id}
      followedCount={result.page.followedCount}
    />
  );
}

export default function FollowingPage() {
  return (
    <Suspense fallback={<FollowingFallback />}>
      <FollowingLoader />
    </Suspense>
  );
}
