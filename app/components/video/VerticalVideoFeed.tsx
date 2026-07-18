"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { DiscoverStats } from "../../discover/types";
import type { WatchVideo } from "../../watch/types";
import type { WatchPanelId } from "./watchTypes";
import VideoSlide from "./VideoSlide";

type VerticalVideoFeedProps = {
  videos: WatchVideo[];
  initialIndex?: number;
  viewerId?: string | null;
  forcePause?: boolean;
  transitionLocked?: boolean;
  emptyMessage?: string;
  onActiveChange?: (video: WatchVideo, index: number) => void;
  onOpenPanel: (panel: Exclude<WatchPanelId, null>) => void;
  onPostJourney: (video: WatchVideo) => void;
  onNearEnd?: () => void;
  onVideoPatch?: (
    videoId: string,
    patch: Partial<WatchVideo>
  ) => void;
  onFollowChange?: (authorId: string, following: boolean) => void;
  /** Bump when a load-more attempt fails so near-end can fire again. */
  loadMoreEpoch?: number;
};

const NEIGHBOR_WINDOW = 1;

export default function VerticalVideoFeed({
  videos,
  initialIndex = 0,
  viewerId = null,
  forcePause = false,
  transitionLocked = false,
  emptyMessage = "No videos available.",
  onActiveChange,
  onOpenPanel,
  onPostJourney,
  onNearEnd,
  onVideoPatch,
  onFollowChange,
  loadMoreEpoch = 0,
}: VerticalVideoFeedProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const slideNodesRef = useRef<Map<string, HTMLElement>>(new Map());
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.min(Math.max(initialIndex, 0), Math.max(videos.length - 1, 0))
  );
  const [muted, setMuted] = useState(true);
  const nearEndRequestedRef = useRef(false);

  const activeVideo = videos[activeIndex] ?? videos[0];

  const mountedIndexes = useMemo(() => {
    const indexes = new Set<number>();

    for (
      let index = activeIndex - NEIGHBOR_WINDOW;
      index <= activeIndex + NEIGHBOR_WINDOW;
      index += 1
    ) {
      if (index >= 0 && index < videos.length) {
        indexes.add(index);
      }
    }

    return indexes;
  }, [activeIndex, videos.length]);

  const setSlideNode = useCallback((id: string, node: HTMLElement | null) => {
    if (node) {
      slideNodesRef.current.set(id, node);
      return;
    }

    slideNodesRef.current.delete(id);
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;

    if (!scroller || videos.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        let topEntry: IntersectionObserverEntry | null = null;

        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          if (
            !topEntry ||
            entry.intersectionRatio > topEntry.intersectionRatio
          ) {
            topEntry = entry;
          }
        }

        if (!topEntry) {
          return;
        }

        const videoId = (topEntry.target as HTMLElement).dataset.videoId;
        const nextIndex = videos.findIndex((video) => video.id === videoId);

        if (nextIndex >= 0) {
          setActiveIndex(nextIndex);
        }
      },
      {
        root: scroller,
        threshold: [0.55, 0.75],
      }
    );

    slideNodesRef.current.forEach((node) => {
      observer.observe(node);
    });

    return () => {
      observer.disconnect();
    };
  }, [videos, mountedIndexes]);

  useEffect(() => {
    if (!activeVideo) {
      return;
    }

    onActiveChange?.(activeVideo, activeIndex);
  }, [activeIndex, activeVideo, onActiveChange]);

  useEffect(() => {
    nearEndRequestedRef.current = false;
  }, [videos.length, loadMoreEpoch]);

  useEffect(() => {
    if (activeIndex >= videos.length - 3) {
      if (!nearEndRequestedRef.current) {
        nearEndRequestedRef.current = true;
        onNearEnd?.();
      }
    }
  }, [activeIndex, videos.length, onNearEnd]);

  useEffect(() => {
    const target = videos[initialIndex];

    if (!target) {
      return;
    }

    const node = slideNodesRef.current.get(target.id);

    if (node) {
      node.scrollIntoView({ block: "start" });
      setActiveIndex(initialIndex);
    }
  }, [initialIndex, videos]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.key !== "ArrowDown" &&
        event.key !== "ArrowUp" &&
        event.key !== "j" &&
        event.key !== "k"
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
      }

      event.preventDefault();

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      const delta =
        event.key === "ArrowDown" || event.key === "j" ? 1 : -1;
      const nextIndex = Math.min(
        Math.max(activeIndex + delta, 0),
        videos.length - 1
      );

      const nextVideo = videos[nextIndex];
      const node = nextVideo
        ? slideNodesRef.current.get(nextVideo.id)
        : null;

      node?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, videos]);

  function handleToggleMute() {
    setMuted((value) => !value);
  }

  if (videos.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center px-6 text-center text-white/60"
        role="status"
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={scrollerRef}
      className="video-snap-scroller h-full w-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain"
      aria-label="Vertical video feed"
    >
      {videos.map((video, index) => {
        const shouldMountPlayer = mountedIndexes.has(index);

        return (
          <div
            key={video.id}
            className="h-full w-full shrink-0 snap-start snap-always"
          >
            {shouldMountPlayer ? (
              <VideoSlide
                video={video}
                active={index === activeIndex}
                muted={muted}
                viewerId={viewerId}
                forcePause={forcePause}
                transitionLocked={transitionLocked}
                onToggleMute={handleToggleMute}
                onOpenPanel={onOpenPanel}
                onPostJourney={onPostJourney}
                onStatsChange={(stats) =>
                  onVideoPatch?.(video.id, {
                    stats: { ...video.stats, ...stats } as DiscoverStats,
                  })
                }
                onFlagsChange={(flags) => onVideoPatch?.(video.id, flags)}
                onFollowChange={onFollowChange}
                onSrcChange={(src) => onVideoPatch?.(video.id, { src })}
                slideRef={(node) => setSlideNode(video.id, node)}
              />
            ) : (
              <div
                ref={(node) => setSlideNode(video.id, node)}
                data-video-id={video.id}
                className="flex h-full w-full items-center justify-center bg-[#050510] text-white/40"
              >
                <p className="text-sm font-bold">{video.title}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
