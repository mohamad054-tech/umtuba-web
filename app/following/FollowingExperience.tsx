"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { loadFollowingFeedPageAction } from "../actions/loadFollowingFeed";
import AppTopNav from "../components/AppTopNav";
import { useTranslation } from "../components/i18n";
import CommentsPanel from "../components/social/CommentsPanel";
import ProductEmptyState from "../components/product/ProductEmptyState";
import ProductErrorState from "../components/product/ProductErrorState";
import DiscoverFeed from "../discover/components/DiscoverFeed";
import type { DiscoverStats, DiscoverVideo } from "../discover/types";
import {
  APP_ROUTES,
  MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS,
} from "../lib/nav";
import {
  appendUniqueById,
  FEED_LOAD_MORE_ERROR_MESSAGE,
  shouldStartFeedLoadMore,
} from "../lib/video/feedPagination";
import { sanitizeUserFacingMessage } from "../lib/product/userFacingMessage";

type FollowingExperienceProps = {
  videos: DiscoverVideo[];
  initialCursor?: string | null;
  loadError?: string | null;
  initialViewerId: string;
  followedCount: number;
};

export default function FollowingExperience({
  videos: initialVideos,
  initialCursor = null,
  loadError = null,
  initialViewerId,
  followedCount,
}: FollowingExperienceProps) {
  const { t } = useTranslation();
  const [videos, setVideos] = useState(initialVideos);
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [loadMoreEpoch, setLoadMoreEpoch] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const nextCursorRef = useRef<string | null>(initialCursor);
  nextCursorRef.current = nextCursor;

  const [activeVideo, setActiveVideo] = useState<DiscoverVideo | null>(
    () => videos[0] ?? null
  );
  const [commentsOpen, setCommentsOpen] = useState(false);

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
      const result = await loadFollowingFeedPageAction({ cursor });
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

  const nav = (
    <AppTopNav
      title={t("following.title")}
      subtitle={t("following.subtitle")}
      actions={
        <Link
          href={APP_ROUTES.home}
          className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80 transition hover:bg-white/10"
        >
          {t("nav.home")}
        </Link>
      }
    />
  );

  if (loadError) {
    return (
      <main
        className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
      >
        {nav}
        <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
          <ProductErrorState
            title={t("following.errorTitle")}
            message={sanitizeUserFacingMessage(loadError)}
            onRetry={() => {
              window.location.assign(APP_ROUTES.following);
            }}
          />
        </div>
      </main>
    );
  }

  if (videos.length === 0 || !activeVideo) {
    return (
      <main
        className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
      >
        {nav}
        <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
          <ProductEmptyState
            compact
            eyebrow={t("following.title")}
            title={t("following.emptyTitle")}
            description={
              followedCount === 0
                ? t("following.emptyDescription")
                : t("following.emptyNoPosts")
            }
            primaryHref={APP_ROUTES.home}
            primaryLabel={t("following.emptyCta")}
            secondaryHref={APP_ROUTES.live}
            secondaryLabel={t("nav.live")}
          />
        </div>
      </main>
    );
  }

  const activePostId = Number(activeVideo.id);
  const commentsReturnPath = `${APP_ROUTES.following}?post=${activeVideo.id}`;

  return (
    <main
      className={`relative flex min-h-screen flex-col overflow-x-hidden bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      {nav}
      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-0 md:px-6 md:py-5">
        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-stretch md:justify-center md:gap-6">
          <div className="relative mx-auto w-full max-w-[510px] shrink-0 xl:mx-0 xl:w-[510px]">
            <div className="video-watch-stage relative z-10 h-[calc(100dvh-4rem-var(--app-mobile-bottom-nav-offset,0px))] w-full overflow-hidden bg-black md:h-[calc(100dvh-7.5rem)] md:rounded-[36px] md:border md:border-white/10">
              <DiscoverFeed
                videos={videos}
                initialIndex={0}
                viewerId={initialViewerId}
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

              {commentsOpen &&
              Number.isInteger(activePostId) &&
              activePostId > 0 ? (
                <CommentsPanel
                  key={activePostId}
                  open={commentsOpen}
                  postId={activePostId}
                  commentCount={activeVideo.stats.comments}
                  returnPath={commentsReturnPath}
                  onClose={() => setCommentsOpen(false)}
                  onCountChange={(count) =>
                    handleStatsChange(activeVideo.id, { comments: count })
                  }
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
