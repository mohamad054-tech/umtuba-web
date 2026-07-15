"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { DiscoverStats, DiscoverVideo } from "../types";
import DiscoverVideoCard from "./DiscoverVideoCard";

type DiscoverFeedProps = {
  videos: DiscoverVideo[];
  initialIndex?: number;
  /** Session viewer id from the Discover page (null if signed out). */
  viewerId?: string | null;
  onActiveChange?: (video: DiscoverVideo, index: number) => void;
  onComment?: (video: DiscoverVideo) => void;
  onStatsChange?: (videoId: string, stats: Partial<DiscoverStats>) => void;
  onFlagsChange?: (
    videoId: string,
    flags: { likedByMe?: boolean; savedByMe?: boolean }
  ) => void;
  onNearEnd?: () => void;
};

const NEIGHBOR_WINDOW = 1;

/**
 * Scroll a slide into view inside the feed scroller only.
 * Never use Element.scrollIntoView — it can scroll window/ancestors and
 * push the Discover top nav off-screen, trapping wheel input in the feed.
 */
function scrollScrollerToSlide(
  scroller: HTMLElement,
  slide: HTMLElement,
  behavior: ScrollBehavior
) {
  const top =
    slide.getBoundingClientRect().top -
    scroller.getBoundingClientRect().top +
    scroller.scrollTop;
  scroller.scrollTo({ top, behavior });
}

export default function DiscoverFeed({
  videos,
  initialIndex = 0,
  viewerId = null,
  onActiveChange,
  onComment,
  onStatsChange,
  onFlagsChange,
  onNearEnd,
}: DiscoverFeedProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const slideNodesRef = useRef<Map<string, HTMLElement>>(new Map());
  const activeIndexRef = useRef(0);
  const nearEndRequestedRef = useRef(false);
  /** Stable Set mutated for session view dedupe (does not trigger re-render). */
  const [sessionViews] = useState(() => new Set<number>());
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.min(Math.max(initialIndex, 0), Math.max(videos.length - 1, 0))
  );

  const activeVideo = videos[activeIndex] ?? videos[0];

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    nearEndRequestedRef.current = false;
  }, [videos.length]);

  useEffect(() => {
    if (activeIndex >= videos.length - 3) {
      if (!nearEndRequestedRef.current) {
        nearEndRequestedRef.current = true;
        onNearEnd?.();
      }
    }
  }, [activeIndex, videos.length, onNearEnd]);

  useEffect(() => {
    if (initialIndex <= 0 || videos.length === 0) {
      return;
    }

    const scroller = scrollerRef.current;
    const frame = window.requestAnimationFrame(() => {
      const video = videos[initialIndex];
      const node = video ? slideNodesRef.current.get(video.id) : null;

      if (scroller && node) {
        scrollScrollerToSlide(scroller, node, "auto");
        setActiveIndex(initialIndex);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [initialIndex, videos]);

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

  const scrollToIndex = useCallback(
    (nextIndex: number) => {
      const scroller = scrollerRef.current;
      const clamped = Math.min(Math.max(nextIndex, 0), videos.length - 1);
      const nextVideo = videos[clamped];
      const node = nextVideo
        ? slideNodesRef.current.get(nextVideo.id)
        : null;

      if (!scroller || !node) {
        return;
      }

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      scrollScrollerToSlide(
        scroller,
        node,
        prefersReducedMotion ? "auto" : "smooth"
      );
      setActiveIndex(clamped);
    },
    [videos]
  );

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

      const delta =
        event.key === "ArrowDown" || event.key === "j" ? 1 : -1;
      const current = activeIndexRef.current;
      const next = current + delta;

      if (next < 0 || next >= videos.length) {
        // At feed edge — do not trap keys so page/chrome remain usable.
        return;
      }

      event.preventDefault();
      scrollToIndex(next);
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [scrollToIndex, videos.length]);

  if (videos.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-white/60">
        <p className="text-lg font-black text-white/80">No videos yet</p>
        <p className="max-w-sm text-sm text-white/50">
          When creators publish video posts, they will show up here.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollerRef}
      className="video-snap-scroller h-full w-full snap-y snap-mandatory overflow-y-auto"
      aria-label="Discover vertical video feed"
    >
      {videos.map((video, index) => {
        const shouldMountPlayer = mountedIndexes.has(index);

        return (
          <div
            key={video.id}
            ref={(node) => setSlideNode(video.id, node)}
            data-video-id={video.id}
            className="h-full w-full shrink-0 snap-start snap-always"
          >
            {shouldMountPlayer ? (
              <DiscoverVideoCard
                video={video}
                active={index === activeIndex}
                viewerId={viewerId}
                sessionViews={sessionViews}
                onComment={() => onComment?.(video)}
                onStatsChange={(stats) => onStatsChange?.(video.id, stats)}
                onFlagsChange={(flags) => onFlagsChange?.(video.id, flags)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#050510] text-white/40">
                <p className="text-sm font-bold">
                  {video.location.city}, {video.location.country}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
