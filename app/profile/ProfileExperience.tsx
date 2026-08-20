"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import FollowButton from "../components/social/FollowButton";
import {
  formatFollowCountLabel,
  type FollowSnapshot,
} from "../../lib/supabase/follows";
import { APP_ROUTES } from "../lib/nav";
import {
  ProfileAbout,
  ProfileActions,
  ProfileAllPanel,
  ProfileHeader,
  ProfileIdentityAchievements,
  ProfileIdentityStrip,
  ProfileLivePanel,
  ProfilePostsPanel,
  ProfileShell,
  ProfileStats,
  ProfileTabs,
  ProfileVideoGrid,
  type ProfileTabId,
} from "./components";
import { CREATOR_SPACE_COPY } from "./lib/profileCreatorSpaceIa";
import {
  PROFILE_ERROR_SOFT_BANNER_CLASS,
  PROFILE_ERROR_STATES_COPY,
} from "./lib/profileErrorStates";
import { PROFILE_A11Y_TOUCH_TARGET_CLASS } from "./lib/profileAccessibility";
import ProfileArticlesPanel from "./components/ProfileArticlesPanel";
import ProfileCoursesPanel from "./components/ProfileCoursesPanel";
import ProfilePhotosPanel from "./components/ProfilePhotosPanel";
import ProfileProductsPanel from "./components/ProfileProductsPanel";
import ProfileLinkedArticlePrompt from "./components/ProfileLinkedArticlePrompt";
import type { ProfileView } from "./types";
import { isUuid } from "../lib/nav";
import {
  countProfilePhotos,
  countProfilePosts,
  getVisibleProfileTabs,
  resolveActiveProfileTab,
} from "./lib/profileTabs";
import {
  countProfileCourses,
  countProfileProducts,
} from "./lib/profileCoursesProductsStructure";
import {
  PROFILE_HERO_COLLAPSE_SCROLL_PX,
  PROFILE_PAGE_ENTER_CLASS,
  PROFILE_TAB_PANEL_FADE_CLASS,
} from "./lib/profileMotionA11y";

type ProfileExperienceProps = {
  profile: ProfileView;
  isOwner: boolean;
  viewerId?: string | null;
};

export default function ProfileExperience({
  profile,
  isOwner,
  viewerId = null,
}: ProfileExperienceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const retrySecondaryFetch = useCallback(() => {
    router.refresh();
  }, [router]);
  const showLiveTab =
    profile.liveSessions.length > 0 || Boolean(profile.isLive);
  const photoCount = useMemo(
    () => countProfilePhotos(profile.posts),
    [profile.posts]
  );
  const postCount = useMemo(
    () => countProfilePosts(profile.posts),
    [profile.posts]
  );
  /** Courses / Products Structure V1 — counts from view-model previews. */
  const courseCount = countProfileCourses(profile.courses);
  const productCount = countProfileProducts(profile.products);

  const visibleTabs = useMemo(
    () =>
      getVisibleProfileTabs({
        isOwner,
        articleCount: profile.articles.length,
        videoCount: profile.videoTotalCount,
        courseCount,
        productCount,
        photoCount,
        postCount,
        showLiveTab,
      }),
    [
      isOwner,
      profile.articles.length,
      profile.videoTotalCount,
      courseCount,
      productCount,
      photoCount,
      postCount,
      showLiveTab,
    ]
  );

  const [activeTab, setActiveTab] = useState<ProfileTabId>(() =>
    resolveActiveProfileTab(searchParams.get("tab"), visibleTabs)
  );
  const [isFollowing, setIsFollowing] = useState(
    Boolean(profile.isFollowing)
  );
  const [followersLabel, setFollowersLabel] = useState(profile.followersLabel);
  const [followingLabel, setFollowingLabel] = useState(profile.followingLabel);
  const [isHeroCollapsed, setIsHeroCollapsed] = useState(false);
  const [hiddenPostIds, setHiddenPostIds] = useState<number[]>([]);
  const [hiddenVideoIds, setHiddenVideoIds] = useState<string[]>([]);
  const linkedArticleIdRaw = searchParams.get("article");
  const linkedArticleId =
    linkedArticleIdRaw && isUuid(linkedArticleIdRaw)
      ? linkedArticleIdRaw.trim()
      : null;
  const linkedArticle =
    linkedArticleId != null
      ? profile.articles.find((article) => article.id === linkedArticleId) ??
        null
      : null;
  /** Prompt only when arriving with a valid ?article= UUID (from a linked video). */
  const showLinkedArticlePrompt = Boolean(linkedArticleId);

  useEffect(() => {
    setActiveTab(
      resolveActiveProfileTab(searchParams.get("tab"), visibleTabs)
    );
  }, [searchParams, visibleTabs]);

  useEffect(() => {
    const updateHeroCollapse = () =>
      setIsHeroCollapsed(window.scrollY >= PROFILE_HERO_COLLAPSE_SCROLL_PX);
    updateHeroCollapse();
    window.addEventListener("scroll", updateHeroCollapse, { passive: true });
    return () => window.removeEventListener("scroll", updateHeroCollapse);
  }, []);

  function handleFollowChange(snapshot: FollowSnapshot) {
    setIsFollowing(snapshot.following);
    setFollowersLabel(formatFollowCountLabel(snapshot.followersCount));
    setFollowingLabel(formatFollowCountLabel(snapshot.followingCount));
  }

  const canFollow =
    !isOwner && profile.source === "supabase" && isUuid(profile.id);

  const visibleVideos = profile.videos.filter(
    (video) => !hiddenVideoIds.includes(video.id)
  );
  const visiblePosts = profile.posts.filter(
    (post) => !hiddenPostIds.includes(post.id)
  );
  const visibleContentCards = (profile.contentCards ?? []).filter((card) => {
    if (card.discoveryPostId != null && hiddenPostIds.includes(card.discoveryPostId)) {
      return false;
    }
    return !hiddenVideoIds.includes(card.sourceEntityId);
  });

  function handleOwnedVideoDeleted(videoId: string, postId: number) {
    setHiddenVideoIds((current) =>
      current.includes(videoId) ? current : [...current, videoId]
    );
    setHiddenPostIds((current) =>
      current.includes(postId) ? current : [...current, postId]
    );
    router.refresh();
  }

  function handleOwnedPostDeleted(postId: number) {
    setHiddenPostIds((current) =>
      current.includes(postId) ? current : [...current, postId]
    );
    router.refresh();
  }

  return (
    <ProfileShell>
      <div className="space-y-5 md:space-y-6">
        {profile.source === "mock" ? (
          <p
            role="status"
            className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          >
            {CREATOR_SPACE_COPY.mockBanner}
          </p>
        ) : null}

        {showLinkedArticlePrompt && linkedArticleId ? (
          <ProfileLinkedArticlePrompt
            articleId={linkedArticleId}
            articleTitle={linkedArticle?.title ?? null}
            username={profile.username}
          />
        ) : null}

        <section
          className={`space-y-5 rounded-[28px] border border-white/10 bg-[#080816]/70 p-5 backdrop-blur-xl md:rounded-[32px] md:p-7 ${PROFILE_PAGE_ENTER_CLASS}`}
        >
          <ProfileHeader profile={profile} isCollapsed={isHeroCollapsed} />
          <ProfileIdentityStrip
            profile={profile}
            isCollapsed={isHeroCollapsed}
            onOpenAbout={() => setActiveTab("about")}
          />
          <ProfileIdentityAchievements
            profile={profile}
            isCollapsed={isHeroCollapsed}
            onOpenAbout={() => setActiveTab("about")}
          />
          <ProfileStats
            followersLabel={followersLabel}
            followingLabel={followingLabel}
            likesLabel={profile.likesLabel}
            viewsLabel={profile.viewsLabel}
          />
          <ProfileActions
            profile={profile}
            isOwner={isOwner}
            viewerId={viewerId}
            isFollowing={isFollowing}
            onFollowChange={handleFollowChange}
          />
          {isOwner ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href={APP_ROUTES.createPost}
                className={`watch-focus-ring ${PROFILE_A11Y_TOUCH_TARGET_CLASS} inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold`}
              >
                Write Post
              </Link>
              <Link
                href={APP_ROUTES.createArticle}
                className={`watch-focus-ring ${PROFILE_A11Y_TOUCH_TARGET_CLASS} inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold`}
              >
                Write article
              </Link>
              <Link
                href={APP_ROUTES.createVideo}
                className={`watch-focus-ring ${PROFILE_A11Y_TOUCH_TARGET_CLASS} inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold`}
              >
                Upload video
              </Link>
            </div>
          ) : null}
        </section>

        <div className="sticky top-0 z-20 space-y-2 bg-[#050510]/80 py-2 backdrop-blur">
          <div
            className={`overflow-hidden rounded-2xl border border-white/10 bg-[#080816]/90 transition-[max-height,opacity,transform] duration-200 motion-reduce:transition-none ${
              isHeroCollapsed
                ? "max-h-20 translate-y-0 opacity-100"
                : "pointer-events-none max-h-0 -translate-y-1 opacity-0"
            }`}
            aria-hidden={!isHeroCollapsed}
          >
            <div className="flex items-center gap-3 px-3 py-2.5">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- public profile avatar
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover ring-1 ring-white/15"
                />
              ) : (
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-sm font-black ${profile.avatarGradient}`}
                >
                  {profile.avatarInitial}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">{profile.displayName}</p>
                <p className="truncate text-xs text-white/45">@{profile.username}</p>
              </div>
              {canFollow ? (
                <FollowButton
                  targetUserId={profile.id}
                  viewerId={viewerId}
                  initialFollowing={isFollowing}
                  returnPath={`${APP_ROUTES.profile}/${profile.username}`}
                  onFollowChange={handleFollowChange}
                  className={PROFILE_A11Y_TOUCH_TARGET_CLASS}
                />
              ) : null}
            </div>
          </div>
          <ProfileTabs
            activeTab={activeTab}
            onChange={setActiveTab}
            tabs={visibleTabs}
            videoCount={profile.videoTotalCount}
            articleCount={profile.articles.length}
            liveCount={profile.liveSessions.length}
            courseCount={courseCount}
            productCount={productCount}
            photoCount={photoCount}
            postCount={postCount}
          />
        </div>

        {profile.statsLoadFailed ? (
          <p role="status" className={PROFILE_ERROR_SOFT_BANNER_CLASS}>
            {PROFILE_ERROR_STATES_COPY.statsSoftBanner}
          </p>
        ) : null}

        <section
          key={activeTab}
          id={`profile-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`profile-tab-${activeTab}`}
          tabIndex={0}
          className={`space-y-6 outline-none ${PROFILE_TAB_PANEL_FADE_CLASS}`}
        >
          {activeTab === "all" ? (
            <>
              {visiblePosts.length > 0 || profile.postsLoadFailed ? (
                <ProfilePostsPanel
                  posts={visiblePosts}
                  loadFailed={Boolean(profile.postsLoadFailed)}
                />
              ) : null}
              {visibleContentCards.length > 0 ||
              profile.registryLoadFailed ||
              !(visiblePosts.length > 0 || profile.postsLoadFailed) ? (
                <ProfileAllPanel
                  cards={visibleContentCards}
                  pinnedCards={profile.pinnedContentCards}
                  loadFailed={Boolean(profile.registryLoadFailed)}
                  onRetry={retrySecondaryFetch}
                  isOwner={isOwner}
                />
              ) : null}
            </>
          ) : null}
          {activeTab === "posts" ? (
            <ProfilePostsPanel
              posts={visiblePosts}
              loadFailed={Boolean(profile.postsLoadFailed)}
            />
          ) : null}
          {activeTab === "articles" ? (
            <ProfileArticlesPanel
              articles={profile.articles}
              loadFailed={Boolean(profile.articlesLoadFailed)}
              onRetry={retrySecondaryFetch}
              isOwner={isOwner}
            />
          ) : null}
          {activeTab === "videos" ? (
            <ProfileVideoGrid
              videos={visibleVideos}
              hasMore={Boolean(profile.hasMoreVideos)}
              loadFailed={Boolean(profile.videosLoadFailed)}
              onRetry={retrySecondaryFetch}
              isOwner={isOwner}
              onVideoDeleted={handleOwnedVideoDeleted}
            />
          ) : null}
          {activeTab === "courses" ? (
            <ProfileCoursesPanel
              courses={profile.courses}
              isOwner={isOwner}
            />
          ) : null}
          {activeTab === "products" ? (
            <ProfileProductsPanel
              products={profile.products}
              isOwner={isOwner}
            />
          ) : null}
          {activeTab === "photos" ? (
            <ProfilePhotosPanel
              posts={visiblePosts}
              loadFailed={Boolean(profile.postsLoadFailed)}
              onRetry={retrySecondaryFetch}
              isOwner={isOwner}
              onPostDeleted={handleOwnedPostDeleted}
            />
          ) : null}
          {activeTab === "live" && showLiveTab ? (
            <ProfileLivePanel
              sessions={profile.liveSessions}
              isLive={profile.isLive}
              loadFailed={Boolean(profile.liveLoadFailed)}
              onRetry={retrySecondaryFetch}
            />
          ) : null}
          {activeTab === "about" ? <ProfileAbout profile={profile} /> : null}
        </section>
      </div>
    </ProfileShell>
  );
}

export function ProfileNotFound({ username }: { username: string }) {
  return (
    <ProfileShell>
      <div className="flex flex-1 flex-col items-center justify-center rounded-[28px] border border-white/10 bg-[#080816]/70 px-6 py-16 text-center backdrop-blur-xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-300/80">
          {CREATOR_SPACE_COPY.notFoundEyebrow}
        </p>
        <h2 className="mt-3 text-2xl font-black tracking-tight">
          @{username} not found
        </h2>
        <p className="mt-3 max-w-md text-sm text-white/55">
          {CREATOR_SPACE_COPY.notFoundBody}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Link
            href={APP_ROUTES.home}
            className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black transition hover:bg-white/90"
          >
            Open Home
          </Link>
          <Link
            href={APP_ROUTES.live}
            className="watch-focus-ring rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold transition hover:bg-white/10"
          >
            Open Live
          </Link>
        </div>
      </div>
    </ProfileShell>
  );
}
