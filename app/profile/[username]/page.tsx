import type { Metadata } from "next";
import { Suspense } from "react";
import { loadProfileActivityTier } from "../../actions/activityTiers";
import { buildActivityTierProgress } from "../../../lib/activity-tiers";
import { buildPublicProfileMetadata } from "../../../lib/site/metadata";
import { getProfileFollowSnapshot } from "../../../lib/supabase/follows";
import { listPublishedArticlesForUser } from "../../../lib/articles/articlesFoundation";
import { ensureBuiltinContentAdaptersRegistered } from "../../../lib/content/runtime/registerBuiltinAdapters";
import { mapProjectionsToContentCards } from "../../../lib/content/cards";
import { listProfileProjections } from "../../../lib/content/services/profileProjectionService";
import {
  getProfileContentStats,
  listProfileActiveLiveRooms,
  listProfilePosts,
  listProfileVideos,
  PROFILE_VIDEO_PAGE_SIZE,
} from "../../../lib/supabase/profileContent";
import { getServerUser, createClient } from "../../../lib/supabase/server";
import { getProfileByUsernameFromDb } from "../../../lib/supabase/profiles";
import { normalizeUsername } from "../../../lib/supabase/validation";
import JsonLd from "../../components/JsonLd";
import { buildProfilePageJsonLd } from "../../../lib/site/jsonLd";
import ProfileExperience, { ProfileNotFound } from "../ProfileExperience";
import ProfileLoadingSkeleton from "../components/ProfileLoadingSkeleton";
import { getProfileByUsername } from "../data/mockProfiles";
import { mergeOwnedVideosIntoProfileCards } from "../lib/mergeOwnedVideosIntoProfileCards";
import { mockProfileToView, profileRowToView } from "../lib/mapProfile";
import type { ProfileView } from "../types";

type ProfilePageProps = {
  params: Promise<{ username: string }>;
};

/**
 * Public sharing metadata only: display name, username, bio, optional public avatar.
 * Never includes email, UM Points, location, or other private fields.
 */
export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { username: rawUsername } = await params;
  const username = normalizeUsername(decodeURIComponent(rawUsername || ""));

  if (!username) {
    return buildPublicProfileMetadata(null);
  }

  try {
    const row = await getProfileByUsernameFromDb(username);
    if (!row) {
      return buildPublicProfileMetadata(null);
    }

    const displayName =
      (row.display_name && row.display_name.trim()) ||
      (row.full_name && row.full_name.trim()) ||
      null;

    return buildPublicProfileMetadata({
      username: row.username || username,
      displayName,
      bio: row.bio,
      avatarUrl: row.avatar_url,
    });
  } catch {
    return buildPublicProfileMetadata(null);
  }
}

async function resolveProfile(username: string): Promise<{
  profile: ProfileView | null;
  isOwner: boolean;
  viewerId: string | null;
}> {
  const key = normalizeUsername(username);
  let viewerId: string | null = null;

  try {
    const user = await getServerUser();
    viewerId = user?.id ?? null;
  } catch {
    viewerId = null;
  }

  try {
    const row = await getProfileByUsernameFromDb(key);

    if (row) {
      const supabase = await createClient();
      ensureBuiltinContentAdaptersRegistered();
      const [
        activityTier,
        followResult,
        stats,
        videoPage,
        postsPage,
        articlesPage,
        liveResult,
        projectionPage,
      ] = await Promise.all([
        loadProfileActivityTier(row.id),
        getProfileFollowSnapshot(supabase, row.id),
        getProfileContentStats(supabase, row.id),
        listProfileVideos(supabase, row.id, {
          limit: PROFILE_VIDEO_PAGE_SIZE,
        }),
        listProfilePosts(supabase, row.id),
        listPublishedArticlesForUser(supabase, row.id),
        listProfileActiveLiveRooms(supabase, row.id),
        listProfileProjections(supabase, row.id, { viewerId }),
      ]);

      if (followResult.ok && followResult.missingProfile) {
        return { profile: null, isOwner: false, viewerId };
      }

      const follow = followResult.ok ? followResult : null;
      const articleSummaryById = Object.fromEntries(
        articlesPage.items.map((article) => [article.id, article.excerpt])
      );
      const durationByPostId = Object.fromEntries(
        videoPage.videos.map((video) => [
          String(video.postId),
          video.durationLabel,
        ])
      );
      const previewSrcBySourceId = Object.fromEntries(
        videoPage.videos.map((video) => [
          String(video.postId),
          video.thumbnailUrl,
        ])
      );
      const creator = {
        id: row.id,
        displayName:
          row.display_name?.trim() || row.full_name?.trim() || row.username,
        username: row.username,
        avatarUrl: row.avatar_url,
      };
      const contentCards = mergeOwnedVideosIntoProfileCards(
        mapProjectionsToContentCards(projectionPage.items, {
          creator,
          layoutVariant: "profile",
          summaryBySourceId: articleSummaryById,
          previewSrcBySourceId,
          durationByPostId,
        }),
        videoPage.videos,
        creator
      );

      return {
        profile: {
          ...profileRowToView(row, {
            follow,
            followFailed: !followResult.ok,
            stats,
            statsFailed: stats == null,
            videos: videoPage.videos,
            videosFailed: Boolean(videoPage.failed),
            hasMoreVideos: videoPage.hasMore,
            posts: postsPage.posts,
            postsFailed: Boolean(postsPage.failed),
            articles: articlesPage.items,
            articlesFailed: Boolean(articlesPage.failed),
            registryItems: projectionPage.items.map((item) => ({
              registryId: item.registryId,
              kind: item.kind,
              sourceEntityId: item.sourceEntityId,
              title: item.title,
              href: item.href,
              publishedAt: item.publishedAt,
              discoveryPostId: item.discoveryPostId,
            })),
            contentCards,
            registryFailed: Boolean(projectionPage.failed),
            liveRooms: liveResult.rooms,
            liveFailed: Boolean(liveResult.failed),
          }),
          activityTier,
        },
        isOwner: Boolean(viewerId && viewerId === row.id),
        viewerId,
      };
    }
  } catch (error) {
    console.error("Supabase profile lookup failed:", error);
  }

  // Development-only mock fallback — never mixed into production records.
  if (process.env.NODE_ENV === "development") {
    const mock = getProfileByUsername(key);

    if (mock) {
      return {
        profile: {
          ...mockProfileToView(mock),
          activityTier: buildActivityTierProgress({ score: 420 }),
        },
        isOwner: false,
        viewerId,
      };
    }
  }

  return { profile: null, isOwner: false, viewerId };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username: rawUsername } = await params;
  const username = normalizeUsername(decodeURIComponent(rawUsername || ""));
  const { profile, isOwner, viewerId } = await resolveProfile(username);

  return (
    <Suspense fallback={<ProfileLoadingSkeleton />}>
      {profile ? (
        <>
          <JsonLd
            data={buildProfilePageJsonLd({
              username: profile.username,
              displayName: profile.displayName,
              bio: profile.bio,
              avatarUrl: profile.avatarUrl,
            })}
          />
          <ProfileExperience
            profile={profile}
            isOwner={isOwner}
            viewerId={viewerId}
          />
        </>
      ) : (
        <ProfileNotFound username={username || "unknown"} />
      )}
    </Suspense>
  );
}
