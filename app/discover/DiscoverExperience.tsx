"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useRef, useState, useMemo } from "react";
import { loadDiscoverFeedPageAction } from "../actions/loadDiscoverFeed";
import StartDirectMessageButton from "../components/messaging/StartDirectMessageButton";
import CommentsPanel from "../components/social/CommentsPanel";
import ProductEmptyState from "../components/product/ProductEmptyState";
import ProductErrorState from "../components/product/ProductErrorState";
import {
  APP_ROUTES,
  buildCreatorProfileHref,
  buildHomeCityFocusHref,
  findIndexByCity,
  findIndexByPostId,
  isUuid,
} from "../lib/nav";
import {
  appendUniqueById,
  FEED_LOAD_MORE_ERROR_MESSAGE,
  shouldStartFeedLoadMore,
} from "../lib/video/feedPagination";
import { sanitizeUserFacingMessage } from "../lib/product/userFacingMessage";
import StoryRail from "../stories/components/StoryRail";
import { useTranslation } from "../components/i18n";
import DiscoverFeed from "./components/DiscoverFeed";
import DiscoverShell from "./components/DiscoverShell";
import type { DiscoverStats, DiscoverVideo } from "./types";

type DiscoverExperienceProps = {
  videos: DiscoverVideo[];
  initialCursor?: string | null;
  loadError?: string | null;
  /** Auth user id from the Discover page server render (null if signed out). */
  initialViewerId?: string | null;
};

export default function DiscoverExperience({
  videos: initialVideos,
  initialCursor = null,
  loadError = null,
  initialViewerId = null,
}: DiscoverExperienceProps) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const cityParam = searchParams.get("city");
  const postParam = searchParams.get("post");
  const commentParam = searchParams.get("comment");

  const [videos, setVideos] = useState(initialVideos);
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [loadMoreEpoch, setLoadMoreEpoch] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const nextCursorRef = useRef<string | null>(initialCursor);
  nextCursorRef.current = nextCursor;
  // Fixed from the page session — do not re-fetch (avoids flash + identity skew).
  const viewerId = initialViewerId;

  const initialIndex = useMemo(() => {
    const byPost = findIndexByPostId(videos, postParam);
    if (byPost >= 0) {
      return byPost;
    }
    return findIndexByCity(videos, cityParam);
  }, [cityParam, postParam, videos]);

  const postDeepLinkMatched = useMemo(() => {
    if (!postParam) {
      return true;
    }
    return findIndexByPostId(videos, postParam) >= 0;
  }, [postParam, videos]);

  const focusCommentId = useMemo(() => {
    if (!commentParam || !postDeepLinkMatched) {
      return null;
    }
    const id = Number(commentParam);
    return Number.isInteger(id) && id > 0 ? id : null;
  }, [commentParam, postDeepLinkMatched]);

  const [activeVideo, setActiveVideo] = useState<DiscoverVideo | null>(
    () => videos[initialIndex] ?? videos[0] ?? null
  );
  const [commentsOpen, setCommentsOpen] = useState(
    () =>
      Boolean(commentParam) &&
      findIndexByPostId(initialVideos, postParam) >= 0
  );
  const [deepLinkNoticeDismissed, setDeepLinkNoticeDismissed] = useState(false);
  const showDeepLinkMiss =
    Boolean(postParam) && !postDeepLinkMatched && !deepLinkNoticeDismissed;

  const handleActiveChange = useCallback((video: DiscoverVideo) => {
    setActiveVideo(video);
    setCommentsOpen(false);
  }, []);

  const handleComment = useCallback((video: DiscoverVideo) => {
    setActiveVideo(video);
    setCommentsOpen(true);
  }, []);

  const handleStatsChange = useCallback(
    (videoId: string, stats: Partial<DiscoverStats>) => {
      setVideos((current) =>
        current.map((video) =>
          video.id === videoId
            ? { ...video, stats: { ...video.stats, ...stats } }
            : video
        )
      );
      setActiveVideo((current) =>
        current && current.id === videoId
          ? { ...current, stats: { ...current.stats, ...stats } }
          : current
      );
    },
    []
  );

  const handleFlagsChange = useCallback(
    (videoId: string, flags: { likedByMe?: boolean; savedByMe?: boolean }) => {
      setVideos((current) =>
        current.map((video) =>
          video.id === videoId ? { ...video, ...flags } : video
        )
      );
      setActiveVideo((current) =>
        current && current.id === videoId ? { ...current, ...flags } : current
      );
    },
    []
  );

  const handleFollowChange = useCallback(
    (creatorId: string, following: boolean) => {
      setVideos((current) =>
        current.map((video) =>
          video.creator.id === creatorId
            ? {
                ...video,
                creator: { ...video.creator, isFollowing: following },
              }
            : video
        )
      );
      setActiveVideo((current) =>
        current && current.creator.id === creatorId
          ? {
              ...current,
              creator: { ...current.creator, isFollowing: following },
            }
          : current
      );
    },
    []
  );

  const handleVideoDeleted = useCallback((videoId: string) => {
    setVideos((current) => current.filter((video) => video.id !== videoId));
    setActiveVideo((current) => (current?.id === videoId ? null : current));
    setCommentsOpen(false);
  }, []);

  const handleSrcChange = useCallback((videoId: string, src: string) => {
    setVideos((current) =>
      current.map((video) =>
        video.id === videoId ? { ...video, src } : video
      )
    );
    setActiveVideo((current) =>
      current && current.id === videoId ? { ...current, src } : current
    );
  }, []);

  const loadMore = useCallback(async () => {
    const cursor = nextCursorRef.current;
    if (
      !shouldStartFeedLoadMore({
        nextCursor: cursor,
        loadingMore: loadingMoreRef.current,
      })
    ) {
      return;
    }

    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    setLoadMoreError(null);

    try {
      const result = await loadDiscoverFeedPageAction({ cursor });
      if (!result.ok) {
        setLoadMoreError(FEED_LOAD_MORE_ERROR_MESSAGE);
        setLoadMoreEpoch((epoch) => epoch + 1);
        return;
      }

      setVideos((current) => appendUniqueById(current, result.videos));
      setNextCursor(result.nextCursor);
      setLoadMoreError(null);
    } catch {
      setLoadMoreError(FEED_LOAD_MORE_ERROR_MESSAGE);
      setLoadMoreEpoch((epoch) => epoch + 1);
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, []);

  const handleNearEnd = useCallback(() => {
    void loadMore();
  }, [loadMore]);

  if (loadError) {
    return (
      <DiscoverShell>
        <div className="flex flex-1 flex-col gap-3">
          <StoryRail viewerId={viewerId} />
          <div className="flex flex-1 items-center justify-center px-6 py-16">
            <ProductErrorState
              title="Could not load videos"
              message={sanitizeUserFacingMessage(loadError)}
              onRetry={() => {
                window.location.assign(APP_ROUTES.home);
              }}
            />
          </div>
        </div>
      </DiscoverShell>
    );
  }

  if (videos.length === 0 || !activeVideo) {
    return (
      <DiscoverShell>
        <div className="flex flex-1 flex-col gap-3">
          <StoryRail viewerId={viewerId} />
          <div className="flex flex-1 items-center justify-center px-6 py-16">
            <ProductEmptyState
              compact
              eyebrow={t("nav.discover")}
              title={t("status.empty")}
              description={t("empty.description")}
              primaryHref={APP_ROUTES.createVideo}
              primaryLabel={t("watch.uploadVideo")}
              secondaryHref={APP_ROUTES.live}
              secondaryLabel={t("nav.live")}
            />
          </div>
        </div>
      </DiscoverShell>
    );
  }

  const exploreHref = buildHomeCityFocusHref(activeVideo.location.city);
  const profileHref = buildCreatorProfileHref({
    username: activeVideo.creator.username,
    articleId: activeVideo.articleId,
  });
  const activePostId = Number(activeVideo.id);
  const peerUserId = activeVideo.creator.id;
  // Hide only for missing/non-UUID peer or self. Signed-out (viewerId null) may message.
  const canMessageAside =
    isUuid(peerUserId) && viewerId !== peerUserId;
  const commentsReturnPath = `${APP_ROUTES.home}?post=${activeVideo.id}`;

  return (
    <DiscoverShell>
      <div className="flex flex-1 flex-col gap-3">
        <StoryRail viewerId={viewerId} />
        {/*
          Home Assembly V1 — page row only.
          < xl: Stage centered alone (mx-auto).
          xl+: center the sealed group [Stage 510][gap][Aside 280]; no Stage mx-auto.
        */}
        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-stretch md:justify-center md:gap-6">
        <div className="relative mx-auto w-full max-w-[510px] shrink-0 xl:mx-0 xl:w-[510px]">
          <div className="video-watch-stage relative z-10 h-[calc(100dvh-4rem-5.75rem-var(--app-mobile-bottom-nav-offset,0px))] w-full overflow-hidden bg-black md:h-[calc(100dvh-7.5rem-5.75rem)] md:rounded-[36px] md:border md:border-white/10">
            <DiscoverFeed
              videos={videos}
              initialIndex={initialIndex}
              viewerId={viewerId}
              onActiveChange={handleActiveChange}
              onComment={handleComment}
              onStatsChange={handleStatsChange}
              onFlagsChange={handleFlagsChange}
              onFollowChange={handleFollowChange}
              onSrcChange={handleSrcChange}
              onNearEnd={handleNearEnd}
              onVideoDeleted={handleVideoDeleted}
              loadMoreEpoch={loadMoreEpoch}
            />

            {showDeepLinkMiss ? (
              <div className="pointer-events-none absolute inset-x-0 top-4 z-30 flex justify-center px-4">
                <div
                  className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-full border border-amber-300/25 bg-black/80 px-4 py-2.5 text-sm text-amber-50 shadow-lg backdrop-blur-md"
                  role="status"
                >
                  <p className="min-w-0 flex-1 text-xs font-bold sm:text-sm">
                    That post is unavailable or not in your current feed.
                  </p>
                  <button
                    type="button"
                    onClick={() => setDeepLinkNoticeDismissed(true)}
                    className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-white"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ) : null}

            {loadMoreError ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-24 z-30 flex justify-center px-4 md:bottom-8">
                <div
                  className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-full border border-white/15 bg-black/75 px-4 py-2.5 text-sm text-white/85 shadow-lg backdrop-blur-md"
                  role="alert"
                >
                  <p className="min-w-0 flex-1 text-xs font-bold sm:text-sm">
                    {loadMoreError}
                  </p>
                  <button
                    type="button"
                    onClick={() => void loadMore()}
                    disabled={isLoadingMore}
                    className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-black disabled:opacity-50"
                  >
                    {isLoadingMore ? t("status.loading") : t("actions.retry")}
                  </button>
                </div>
              </div>
            ) : null}

            {commentsOpen && Number.isInteger(activePostId) && activePostId > 0 ? (
              <CommentsPanel
                key={activePostId}
                open={commentsOpen}
                postId={activePostId}
                commentCount={activeVideo.stats.comments}
                returnPath={commentsReturnPath}
                focusCommentId={focusCommentId}
                onClose={() => setCommentsOpen(false)}
                onCountChange={(count) =>
                  handleStatsChange(activeVideo.id, { comments: count })
                }
              />
            ) : null}
          </div>
        </div>

        <aside className="hidden w-[280px] shrink-0 flex-col justify-center gap-4 xl:flex">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-300/80">
              {t("home.nowPlaying")}
            </p>
            <h2 className="mt-2 text-xl font-black tracking-tight">
              {activeVideo.location.city}
            </h2>
            <p className="mt-1 text-sm text-white/55">
              {activeVideo.location.country}
            </p>
            <p className="mt-4 text-sm leading-6 text-white/70">
              {t("home.asideHint")}
            </p>
            <Link
              href={exploreHref}
              className="watch-focus-ring mt-5 inline-flex rounded-full border border-sky-400/30 bg-sky-500/15 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-sky-50 transition hover:bg-sky-500/25"
            >
              {t("home.exploreCity")}
            </Link>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-300/80">
              {t("home.creator")}
            </p>
            <Link
              href={profileHref}
              className="mt-2 flex items-center gap-3 rounded-2xl transition hover:bg-white/[0.03]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-blue-400/40 to-indigo-600/50 text-sm font-black">
                {activeVideo.creator.avatar}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-lg font-black">
                  {activeVideo.creator.username}
                </span>
                <span className="mt-0.5 block truncate text-sm text-white/55">
                  {activeVideo.creator.name}
                </span>
              </span>
            </Link>
            <div className="mt-4 empty:mt-0 empty:hidden">
              <StartDirectMessageButton
                peerUserId={peerUserId ?? ""}
                peerName={activeVideo.creator.name}
                label={t("home.message")}
                hidden={!canMessageAside}
                className="watch-focus-ring w-full rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white/85 transition hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-60"
              />
            </div>
          </div>
        </aside>
        </div>

        <div className="flex justify-center px-4 pb-4 xl:hidden">
          <Link
            href={exploreHref}
            className="watch-focus-ring rounded-full border border-sky-400/30 bg-sky-500/15 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-sky-50 transition hover:bg-sky-500/25"
          >
            {t("home.exploreCity")}
          </Link>
        </div>
      </div>
    </DiscoverShell>
  );
}
