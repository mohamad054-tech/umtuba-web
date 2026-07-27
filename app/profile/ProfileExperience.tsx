"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  formatFollowCountLabel,
  type FollowSnapshot,
} from "../../lib/supabase/follows";
import { APP_ROUTES } from "../lib/nav";
import {
  ProfileAbout,
  ProfileActions,
  ProfileHeader,
  ProfileLivePanel,
  ProfileShell,
  ProfileStats,
  ProfileTabs,
  ProfileVideoGrid,
  type ProfileTabId,
} from "./components";
import ProfileArticlesPanel from "./components/ProfileArticlesPanel";
import ProfilePostsPanel from "./components/ProfilePostsPanel";
import ProfileLinkedArticlePrompt from "./components/ProfileLinkedArticlePrompt";
import type { ProfileView } from "./types";
import { isUuid } from "../lib/nav";

type ProfileExperienceProps = {
  profile: ProfileView;
  isOwner: boolean;
  viewerId?: string | null;
};

const TAB_IDS: ProfileTabId[] = [
  "all",
  "posts",
  "videos",
  "articles",
  "about",
  "live",
];

function parseTab(raw: string | null): ProfileTabId {
  if (raw && (TAB_IDS as string[]).includes(raw)) {
    return raw as ProfileTabId;
  }
  return "all";
}

export default function ProfileExperience({
  profile,
  isOwner,
  viewerId = null,
}: ProfileExperienceProps) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<ProfileTabId>(() =>
    parseTab(searchParams.get("tab"))
  );
  const [isFollowing, setIsFollowing] = useState(
    Boolean(profile.isFollowing)
  );
  const [followersLabel, setFollowersLabel] = useState(profile.followersLabel);
  const [followingLabel, setFollowingLabel] = useState(profile.followingLabel);
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
    setActiveTab(parseTab(searchParams.get("tab")));
  }, [searchParams]);

  function handleFollowChange(snapshot: FollowSnapshot) {
    setIsFollowing(snapshot.following);
    setFollowersLabel(formatFollowCountLabel(snapshot.followersCount));
    setFollowingLabel(formatFollowCountLabel(snapshot.followingCount));
  }

  const showLiveTab =
    profile.liveSessions.length > 0 || Boolean(profile.isLive);

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

        <section className="space-y-5 rounded-[28px] border border-white/10 bg-[#080816]/70 p-5 backdrop-blur-xl md:rounded-[32px] md:p-7">
          <ProfileHeader profile={profile} />
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

        <ProfileTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          videoCount={profile.videoTotalCount}
          postCount={profile.posts.length}
          articleCount={profile.articles.length}
          liveCount={profile.liveSessions.length}
          showLiveTab={showLiveTab}
        />

        {profile.statsLoadFailed ? (
          <p
            role="status"
            className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          >
            Some profile stats couldn&apos;t be loaded. Counts may be incomplete.
          </p>
        ) : null}

        <section
          id={`profile-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`profile-tab-${activeTab}`}
          className="space-y-6"
        >
          {activeTab === "all" ? (
            <>
              <ProfilePostsPanel
                posts={profile.posts}
                loadFailed={Boolean(profile.postsLoadFailed)}
              />
              <ProfileVideoGrid
                videos={profile.videos}
                hasMore={Boolean(profile.hasMoreVideos)}
                loadFailed={Boolean(profile.videosLoadFailed)}
              />
              <ProfileArticlesPanel
                articles={profile.articles}
                loadFailed={Boolean(profile.articlesLoadFailed)}
                isOwner={isOwner}
              />
              {showLiveTab ? (
                <ProfileLivePanel
                  sessions={profile.liveSessions}
                  isLive={profile.isLive}
                  loadFailed={Boolean(profile.liveLoadFailed)}
                />
              ) : null}
            </>
          ) : null}
          {activeTab === "posts" ? (
            <ProfilePostsPanel
              posts={profile.posts}
              loadFailed={Boolean(profile.postsLoadFailed)}
            />
          ) : null}
          {activeTab === "videos" ? (
            <ProfileVideoGrid
              videos={profile.videos}
              hasMore={Boolean(profile.hasMoreVideos)}
              loadFailed={Boolean(profile.videosLoadFailed)}
            />
          ) : null}
          {activeTab === "articles" ? (
            <ProfileArticlesPanel
              articles={profile.articles}
              loadFailed={Boolean(profile.articlesLoadFailed)}
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
