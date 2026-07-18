"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import VerticalVideoFeed from "../components/video/VerticalVideoFeed";
import WatchAmbientBackground from "../components/video/WatchAmbientBackground";
import WatchPanel from "../components/video/WatchPanel";
import type { WatchPanelId } from "../components/video/watchTypes";
import JourneyTransitionDirector from "../components/journey-transition/JourneyTransitionDirector";
import ActivityTierIndicator from "../components/activity-tiers/ActivityTierIndicator";
import WalletBalanceIndicator from "../components/wallet/WalletBalanceIndicator";
import NotificationBell from "../components/NotificationBell";
import CommentsPanel from "../components/social/CommentsPanel";
import UserMenu from "../components/UserMenu";
import {
  loadWatchFeedPageAction,
} from "../actions/loadWatchFeed";
import { recordFeedViewOnce } from "../lib/video/recordFeedView";
import {
  appendUniqueById,
  FEED_LOAD_MORE_ERROR_MESSAGE,
  shouldStartFeedLoadMore,
} from "../lib/video/feedPagination";
import { APP_ROUTES } from "../lib/nav";
import { allowWatchPrototypePanels } from "../lib/product/surfaceGates";
import { sanitizeUserFacingMessage } from "../lib/product/userFacingMessage";
import { findWatchVideoIndex } from "./lib/mapWatchVideo";
import type { WatchVideo } from "./types";

const panelCopy: Record<
  Exclude<WatchPanelId, null>,
  { title: string; description: string }
> = {
  comments: {
    title: "Comments",
    description:
      "Conversation around this moment — replies and creator notes.",
  },
  related: {
    title: "Related videos",
    description:
      "More discovery from nearby places, similar moods, and creators worth following.",
  },
  "explore-city": {
    title: "Explore this city",
    description:
      "A future map of creators, places, and journeys connected to this city.",
  },
  ai: {
    title: "AI panel",
    description:
      "Summaries, translations, and creative guidance will appear here without leaving Watch.",
  },
  uconnect: {
    title: "UConnect",
    description:
      "Request a greeting, collaborate, or open a real conversation when creators allow it.",
  },
};

type WatchExperienceProps = {
  initialVideos: WatchVideo[];
  initialCursor: string | null;
  loadError?: string | null;
  usedDemoFallback?: boolean;
  /** Auth user id from the Watch page server render (null if signed out). */
  initialViewerId?: string | null;
};

export default function WatchExperience({
  initialVideos,
  initialCursor,
  loadError = null,
  usedDemoFallback = false,
  initialViewerId = null,
}: WatchExperienceProps) {
  const searchParams = useSearchParams();
  const stageRef = useRef<HTMLDivElement>(null);
  const recordedViewsRef = useRef<Set<number>>(new Set());
  const loadingMoreRef = useRef(false);
  const nextCursorRef = useRef<string | null>(initialCursor);

  const focusKey = searchParams.get("post") ?? searchParams.get("id");
  const seedVideos = initialVideos;
  const initialIndex = findWatchVideoIndex(seedVideos, focusKey);
  const prototypePanelsAllowed = allowWatchPrototypePanels();

  const [videos, setVideos] = useState<WatchVideo[]>(seedVideos);
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [loadMoreEpoch, setLoadMoreEpoch] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<WatchVideo | null>(
    () => seedVideos[initialIndex] ?? seedVideos[0] ?? null
  );
  const [activePanel, setActivePanel] = useState<WatchPanelId>(null);
  const [journeyTransitionActive, setJourneyTransitionActive] = useState(false);
  const [forcePause, setForcePause] = useState(false);
  const [journeyVideo, setJourneyVideo] = useState<WatchVideo | null>(null);
  const [demoFallback] = useState(usedDemoFallback);
  nextCursorRef.current = nextCursor;

  const handleActiveChange = useCallback((video: WatchVideo) => {
    setActiveVideo(video);

    if (video.source !== "supabase" || !video.postId) {
      return;
    }

    void recordFeedViewOnce(video.postId, recordedViewsRef.current).then(
      (result) => {
        if (!result.ok) return;
        setVideos((current) =>
          current.map((item) =>
            item.id === video.id
              ? {
                  ...item,
                  stats: { ...item.stats, views: result.views },
                }
              : item
          )
        );
      }
    );
  }, []);

  const handleOpenPanel = useCallback(
    (panel: Exclude<WatchPanelId, null>) => {
      if (
        panel !== "comments" &&
        !allowWatchPrototypePanels()
      ) {
        return;
      }
      setActivePanel(panel);
    },
    []
  );

  const handleClosePanel = useCallback(() => {
    setActivePanel(null);
  }, []);

  const handlePauseVideo = useCallback(() => {
    setForcePause(true);
  }, []);

  const handlePostJourney = useCallback(
    (video: WatchVideo) => {
      if (journeyTransitionActive) {
        return;
      }

      setActivePanel(null);
      setJourneyVideo(video);
      setForcePause(true);
      setJourneyTransitionActive(true);
    },
    [journeyTransitionActive]
  );

  const handleTransitionSettled = useCallback(() => {
    // Navigation is in progress; keep lock until unmount.
  }, []);

  const handleNavigateFailed = useCallback(() => {
    setJourneyTransitionActive(false);
    setForcePause(false);
    setJourneyVideo(null);
  }, []);

  const handleVideoPatch = useCallback(
    (videoId: string, patch: Partial<WatchVideo>) => {
      setVideos((current) =>
        current.map((video) =>
          video.id === videoId ? { ...video, ...patch } : video
        )
      );
      setActiveVideo((current) =>
        current?.id === videoId ? { ...current, ...patch } : current
      );
    },
    []
  );

  const handleFollowChange = useCallback(
    (authorId: string, following: boolean) => {
      setVideos((current) =>
        current.map((video) =>
          video.author.id === authorId
            ? {
                ...video,
                author: { ...video.author, isFollowing: following },
              }
            : video
        )
      );
      setActiveVideo((current) =>
        current && current.author.id === authorId
          ? {
              ...current,
              author: { ...current.author, isFollowing: following },
            }
          : current
      );
    },
    []
  );

  const loadMore = useCallback(async () => {
    const cursor = nextCursorRef.current;
    if (
      !shouldStartFeedLoadMore({
        nextCursor: cursor,
        loadingMore: loadingMoreRef.current,
        disabled: demoFallback,
      })
    ) {
      return;
    }

    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    setLoadMoreError(null);

    try {
      const result = await loadWatchFeedPageAction({ cursor });
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
  }, [demoFallback]);

  const handleNearEnd = useCallback(() => {
    void loadMore();
  }, [loadMore]);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && activePanel && !journeyTransitionActive) {
        setActivePanel(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activePanel, journeyTransitionActive]);

  async function handleToggleFullscreen() {
    const stage = stageRef.current;

    if (!stage) {
      return;
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await stage.requestFullscreen();
    } catch (error) {
      console.error("Fullscreen is not available:", error);
    }
  }

  const panelMeta = useMemo(() => {
    if (!activePanel) {
      return null;
    }

    return panelCopy[activePanel];
  }, [activePanel]);

  const transitionVideo = journeyVideo ?? activeVideo;
  const emptyMessage = loadError
    ? sanitizeUserFacingMessage(loadError)
    : "No published videos yet. Create one to start the Watch feed.";

  return (
    <main className="watch-page-enter relative min-h-screen overflow-hidden bg-[#050510] text-white md:min-h-screen">
      <WatchAmbientBackground video={activeVideo} />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:pointer-events-auto md:relative md:px-8">
        <Link
          href="/"
          className="watch-focus-ring pointer-events-auto rounded-full bg-black/25 px-3 py-1 text-2xl font-black tracking-tight backdrop-blur-md md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none"
        >
          UMTUBA
        </Link>

        <p className="hidden max-w-md truncate text-sm text-white/50 md:block">
          {activeVideo
            ? `${activeVideo.location.city} · ${activeVideo.title}`
            : "Discover the world"}
        </p>

        <div className="pointer-events-auto flex items-center gap-2 md:gap-3">
          <ActivityTierIndicator compact />
          <WalletBalanceIndicator compact />
          <NotificationBell />
          <UserMenu />

          <Link
            href={APP_ROUTES.discover}
            className="watch-focus-ring rounded-full border border-white/15 bg-black/35 px-4 py-2 text-sm font-bold backdrop-blur hover:bg-white/10 md:bg-white/5"
          >
            Discover
          </Link>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            disabled={journeyTransitionActive}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className="watch-focus-ring hidden rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold backdrop-blur hover:bg-white/10 disabled:opacity-50 md:inline-flex"
          >
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
        </div>
      </header>

      {demoFallback ? (
        <p
          role="status"
          className="relative z-20 mx-auto max-w-7xl px-4 pt-2 text-center text-[11px] font-bold text-amber-100/80 md:px-8"
        >
          Showing demo videos — publish a video post to replace this fallback.
        </p>
      ) : null}

      <div className="relative z-10 mx-auto flex w-full max-w-7xl justify-center px-0 md:px-8 md:pb-8 md:pt-0">
        <div
          ref={stageRef}
          className="video-watch-stage relative h-[calc(100dvh-var(--app-mobile-bottom-nav-offset,0px))] w-full overflow-hidden bg-black md:mt-0 md:h-[calc(100dvh-6.5rem)] md:max-w-[510px] md:rounded-[36px] md:border md:border-white/10"
        >
          <VerticalVideoFeed
            videos={videos}
            initialIndex={initialIndex}
            viewerId={initialViewerId}
            forcePause={forcePause}
            transitionLocked={journeyTransitionActive}
            emptyMessage={emptyMessage}
            onActiveChange={handleActiveChange}
            onOpenPanel={handleOpenPanel}
            onPostJourney={handlePostJourney}
            onNearEnd={handleNearEnd}
            onVideoPatch={handleVideoPatch}
            onFollowChange={handleFollowChange}
            loadMoreEpoch={loadMoreEpoch}
          />

          {loadMoreError ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-24 z-30 flex justify-center px-4 md:bottom-8">
              <div
                className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-full border border-white/15 bg-black/75 px-4 py-2.5 text-sm text-white/85 shadow-lg backdrop-blur-md"
                role="alert"
              >
                <p className="min-w-0 flex-1 text-xs font-bold sm:text-sm">
                  {sanitizeUserFacingMessage(loadMoreError)}
                </p>
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={isLoadingMore}
                  className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-black disabled:opacity-50"
                >
                  {isLoadingMore ? "Loading…" : "Retry"}
                </button>
              </div>
            </div>
          ) : null}

          {activePanel === "comments" &&
          activeVideo?.postId &&
          !journeyTransitionActive ? (
            <div className="absolute inset-x-0 bottom-0 z-40 max-h-[70%] overflow-hidden rounded-t-[28px] border border-white/10 bg-[#080816]/95 backdrop-blur-xl md:inset-x-3 md:bottom-3 md:rounded-[28px]">
              <CommentsPanel
                open
                postId={activeVideo.postId}
                commentCount={activeVideo.stats.comments}
                returnPath={`${APP_ROUTES.watch}?post=${activeVideo.postId}`}
                onClose={handleClosePanel}
                onCountChange={(count) =>
                  handleVideoPatch(activeVideo.id, {
                    stats: { ...activeVideo.stats, comments: count },
                  })
                }
              />
            </div>
          ) : null}

          {prototypePanelsAllowed &&
          panelMeta &&
          activePanel !== "comments" &&
          !journeyTransitionActive ? (
            <WatchPanel
              open={Boolean(activePanel)}
              title={panelMeta.title}
              description={panelMeta.description}
              onClose={handleClosePanel}
            />
          ) : null}
        </div>
      </div>

      {journeyTransitionActive && transitionVideo ? (
        <JourneyTransitionDirector
          active={journeyTransitionActive}
          video={transitionVideo}
          stageRef={stageRef}
          onPauseVideo={handlePauseVideo}
          onSettled={handleTransitionSettled}
          onNavigateFailed={handleNavigateFailed}
        />
      ) : null}
    </main>
  );
}
