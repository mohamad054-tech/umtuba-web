"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  ProfileLivePanel,
  ProfileShell,
  ProfileStats,
  ProfileTabs,
  ProfileVideoGrid,
  type ProfileTabId,
} from "./components";
import ProfileArticlesPanel from "./components/ProfileArticlesPanel";
import ProfileCoursesPanel from "./components/ProfileCoursesPanel";
import ProfilePhotosPanel from "./components/ProfilePhotosPanel";
import ProfileProductsPanel from "./components/ProfileProductsPanel";
import ProfileLinkedArticlePrompt from "./components/ProfileLinkedArticlePrompt";
import type { ProfileView } from "./types";
import { isUuid } from "../lib/nav";
import {
  countProfilePhotos,
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
  const searchParams = useSearchParams();
  const showLiveTab =
    profile.liveSessions.length > 0 || Boolean(profile.isLive);
  const photoCount = useMemo(
    () => countProfilePhotos(profile.posts),
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
        showLiveTab,
      }),
    [
      isOwner,
      profile.articles.length,
      profile.videoTotalCount,
      courseCount,
      productCount,
      photoCount,
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

  return (
    <ProfileShell>
      <div className="space-y-5 md:space-y-6">
        {profile.source === "mock" ? (
          <p
            role="status"
            className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          >
            Development mock profile — not a production Supabase record.
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
                href={APP_ROUTES.createArticle}
                className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold"
              >
                Write article
              </Link>
              <Link
                href={APP_ROUTES.createVideo}
                className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold"
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
          />
        </div>

        {profile.statsLoadFailed ? (
          <p
            role="status"
            className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          >
            Some profile stats couldn&apos;t be loaded. Counts may be incomplete.
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
            <ProfileAllPanel
              cards={profile.contentCards ?? []}
              pinnedCards={profile.pinnedContentCards}
              loadFailed={Boolean(profile.registryLoadFailed)}
            />
          ) : null}
          {activeTab === "articles" ? (
            <ProfileArticlesPanel
              articles={profile.articles}
              loadFailed={Boolean(profile.articlesLoadFailed)}
              isOwner={isOwner}
            />
          ) : null}
          {activeTab === "videos" ? (
            <ProfileVideoGrid
              videos={profile.videos}
              hasMore={Boolean(profile.hasMoreVideos)}
              loadFailed={Boolean(profile.videosLoadFailed)}
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
              posts={profile.posts}
              loadFailed={Boolean(profile.postsLoadFailed)}
              isOwner={isOwner}
            />
          ) : null}
          {activeTab === "live" && showLiveTab ? (
            <ProfileLivePanel
              sessions={profile.liveSessions}
              isLive={profile.isLive}
              loadFailed={Boolean(profile.liveLoadFailed)}
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
          Profile
        </p>
        <h2 className="mt-3 text-2xl font-black tracking-tight">
          @{username} not found
        </h2>
        <p className="mt-3 max-w-md text-sm text-white/55">
          This profile is not in UMTUBA yet. Try Home or Live, or create an
          account to claim your username.
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
