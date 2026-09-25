"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { refreshWatchPlaybackAction } from "../../actions/loadWatchFeed";
import { readUserWantsSound } from "../../../lib/video/feedMutePreference";
import { isFeedPlaybackSuppressed } from "../../../lib/video/feedHiddenPlayback";
import { isPlayableHttpSrc } from "../../lib/video/playbackFetchPolicy";
import type { DiscoverStats, DiscoverVideo } from "../types";
import DiscoverGameBreakCard from "./DiscoverGameBreakCard";
import DiscoverVideoCard from "./DiscoverVideoCard";
import { buildHomeFeedItems, feedIndexForVideo } from "../feedWithGameBreaks";
import { getPlayableGame } from "../../../lib/games/play/catalog";
import { useTranslation } from "../../components/i18n";

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
  onFollowChange?: (creatorId: string, following: boolean) => void;
  onSrcChange?: (videoId: string, src: string) => void;
  onNearEnd?: () => void;
  onVideoDeleted?: (videoId: string, postId: number) => void;
  onCaptionChange?: (videoId: string, caption: string) => void;
  /** Bump when a load-more attempt fails so near-end can fire again. */
  loadMoreEpoch?: number;
  /** Game-break slides are not videos. Close overlays without a watch signal. */
  onNonVideoActive?: () => void;
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
  onFollowChange,
  onSrcChange,
  onNearEnd,
  onVideoDeleted,
  onCaptionChange,
  loadMoreEpoch = 0,
  onNonVideoActive,
}: DiscoverFeedProps) {
  const { t } = useTranslation();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const slideNodesRef = useRef<Map<string, HTMLElement>>(new Map());
  const activeIndexRef = useRef(0);
  const nearEndRequestedRef = useRef(false);
  /** Stable Set mutated for session view dedupe (does not trigger re-render). */
  const [sessionViews] = useState(() => new Set<number>());
  const [activeIndex, setActiveIndex] = useState(() =>
    feedIndexForVideo(
      Math.min(Math.max(initialIndex, 0), Math.max(videos.length - 1, 0))
    )
  );
  const [advanceLocked, setAdvanceLocked] = useState(false);
  const videoIdsKey = videos.map((video) => video.id).join(",");
  const previousVideoIdsRef = useRef(videoIdsKey);
  const signingRef = useRef(new Set<number>());
  const deepLinkAppliedRef = useRef(false);
  const applyingDeepLinkRef = useRef(false);
  const userMovedRef = useRef(false);

  const items = useMemo(() => buildHomeFeedItems(videos), [videos]);
  const activeItem = items[activeIndex];
  const activeVideo = activeItem?.kind === "video" ? activeItem.video : null;

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    nearEndRequestedRef.current = false;
  }, [videos.length, loadMoreEpoch]);

  useEffect(() => {
    if (videos.length === 0) {
      return;
    }
    setActiveIndex((current) => Math.min(current, Math.max(items.length - 1, 0)));
  }, [items.length]);

  useEffect(() => {
    if (
      activeItem?.kind === "video" &&
      activeItem.videoIndex >= videos.length - 3
    ) {
      if (!nearEndRequestedRef.current) {
        nearEndRequestedRef.current = true;
        onNearEnd?.();
      }
    }
  }, [activeIndex, activeItem, videos.length, onNearEnd]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    function onUserScroll() {
      if (applyingDeepLinkRef.current) return;
      userMovedRef.current = true;
      deepLinkAppliedRef.current = true;
    }

    scroller.addEventListener("scroll", onUserScroll, { passive: true });
    scroller.addEventListener("wheel", onUserScroll, { passive: true });
    scroller.addEventListener("touchmove", onUserScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onUserScroll);
      scroller.removeEventListener("wheel", onUserScroll);
      scroller.removeEventListener("touchmove", onUserScroll);
    };
  }, [videos.length]);

  useLayoutEffect(() => {
    if (
      deepLinkAppliedRef.current ||
      userMovedRef.current ||
      videos.length === 0
    ) {
      return;
    }

    const safeVideoIndex = Math.min(Math.max(initialIndex, 0), videos.length - 1);
    const scroller = scrollerRef.current;
    const video = videos[safeVideoIndex];
    const node = video ? slideNodesRef.current.get(video.id) : null;
    if (!video || !scroller || !node) {
      return;
    }

    deepLinkAppliedRef.current = true;
    if (safeVideoIndex > 0) {
      applyingDeepLinkRef.current = true;
      scrollScrollerToSlide(scroller, node, "auto");
      setActiveIndex(feedIndexForVideo(safeVideoIndex));
      window.requestAnimationFrame(() => {
        applyingDeepLinkRef.current = false;
      });
    }
  }, [initialIndex, videos]);

  const mountedIndexes = useMemo(() => {
    const indexes = new Set<number>();

    for (
      let index = activeIndex - NEIGHBOR_WINDOW;
      index <= activeIndex + NEIGHBOR_WINDOW;
      index += 1
    ) {
      if (index >= 0 && index < items.length) {
        indexes.add(index);
      }
    }

    return indexes;
  }, [activeIndex, items.length]);

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
      const clamped = Math.min(Math.max(nextIndex, 0), items.length - 1);
      const nextItem = items[clamped];
      const node = nextItem
        ? slideNodesRef.current.get(nextItem.key)
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
    [items]
  );

  useEffect(() => {
    const previous = previousVideoIdsRef.current.split(",").filter(Boolean);
    previousVideoIdsRef.current = videoIdsKey;
    if (previous.length <= videos.length) {
      return;
    }
    scrollToIndex(activeIndexRef.current);
  }, [videoIdsKey, videos.length, scrollToIndex]);

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

        const feedKey = (topEntry.target as HTMLElement).dataset.feedKey;
        const nextIndex = items.findIndex((item) => item.key === feedKey);

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
  }, [items, mountedIndexes]);

  useEffect(() => {
    const item = items[activeIndex];
    if (!item) return;
    if (item.kind === "video") {
      onActiveChange?.(item.video, item.videoIndex);
      return;
    }
    onNonVideoActive?.();
  }, [activeIndex, items, onActiveChange, onNonVideoActive]);

  useEffect(() => {
    const unsigned = items.filter((item, index) => {
      return (
        item.kind === "video" &&
        mountedIndexes.has(index) &&
        Number.isInteger(Number(item.video.id)) &&
        Number(item.video.id) > 0 &&
        !isPlayableHttpSrc(item.video.src)
      );
    });

    for (const item of unsigned) {
      if (item.kind !== "video") continue;
      const video = item.video;
      const postId = Number(video.id);
      if (!Number.isInteger(postId) || postId <= 0 || signingRef.current.has(postId)) {
        continue;
      }

      signingRef.current.add(postId);
      void refreshWatchPlaybackAction(postId)
        .then((result) => {
          if (result.ok) {
            onSrcChange?.(video.id, result.src);
          }
        })
        .finally(() => {
          signingRef.current.delete(postId);
        });
    }
  }, [items, mountedIndexes, onSrcChange]);

  const stepByDelta = useCallback(
    (delta: number) => {
      const current = activeIndexRef.current;
      const next = current + delta;

      if (next < 0 || next >= items.length) {
        // At feed edge — do not trap keys so page/chrome remain usable.
        return false;
      }

      scrollToIndex(next);
      return true;
    },
    [scrollToIndex, items.length]
  );

  const stepToNextVideo = useCallback(() => {
    let next = activeIndexRef.current + 1;
    while (next < items.length && items[next]?.kind !== "video") {
      next += 1;
    }
    if (next >= items.length) return false;
    scrollToIndex(next);
    return true;
  }, [items, scrollToIndex]);

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
      if (advanceLocked) {
        return;
      }

      const delta =
        event.key === "ArrowDown" || event.key === "j" ? 1 : -1;
      const current = activeIndexRef.current;
      const next = current + delta;

      if (next < 0 || next >= items.length) {
        // At feed edge — do not trap keys so page/chrome remain usable.
        return;
      }

      event.preventDefault();
      stepByDelta(delta);
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [advanceLocked, items.length, stepByDelta]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const activeId = activeVideo?.id;
    if (!scroller) return;
    if (!activeId) {
      scroller.querySelectorAll("video").forEach((video) => {
        video.muted = true;
        video.pause();
      });
      return;
    }

    const wantsSound = readUserWantsSound() && !isFeedPlaybackSuppressed();
    scroller.querySelectorAll<HTMLElement>("[data-video-id]").forEach((slide) => {
      const isActive = slide.dataset.videoId === activeId;
      slide.querySelectorAll("video").forEach((video) => {
        if (!isActive) {
          video.muted = true;
          video.pause();
          return;
        }
        if (wantsSound) {
          video.muted = false;
          if (video.paused && !isFeedPlaybackSuppressed()) {
            void video.play().catch(() => undefined);
          }
        }
      });
    });
  }, [activeIndex, activeVideo?.id, videos]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const feed = scroller;

    function keepSoundOnGesture() {
      if (!readUserWantsSound() || isFeedPlaybackSuppressed()) return;
      const root = feed.getBoundingClientRect();
      const pick: { video: HTMLVideoElement | null; ratio: number } = {
        video: null,
        ratio: 0,
      };
      feed.querySelectorAll<HTMLElement>("[data-video-id]").forEach((slide) => {
        const rect = slide.getBoundingClientRect();
        const visible =
          Math.min(rect.bottom, root.bottom) - Math.max(rect.top, root.top);
        const ratio = visible / Math.max(rect.height, 1);
        const video = slide.querySelector("video");
        if (video && ratio > pick.ratio) {
          pick.ratio = ratio;
          pick.video = video;
        }
      });
      if (!pick.video || pick.ratio < 0.45) return;
      pick.video.muted = false;
      void pick.video.play().catch(() => undefined);
    }

    scroller.addEventListener("pointerup", keepSoundOnGesture);
    return () => scroller.removeEventListener("pointerup", keepSoundOnGesture);
  }, [videos.length]);

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
      {items.map((item, index) => {
        if (item.kind === "game") {
          return (
            <div
              key={item.key}
              ref={(node) => setSlideNode(item.key, node)}
              data-feed-key={item.key}
              data-game-break={item.slug}
              className="h-full w-full shrink-0 snap-start snap-always"
            >
              <DiscoverGameBreakCard
                slug={item.slug}
                title={t(getPlayableGame(item.slug)?.titleKey ?? "feed.gameBreak.title")}
              />
            </div>
          );
        }

        const video = item.video;
        const shouldMountPlayer = mountedIndexes.has(index);
        const hasLaterVideo = items.slice(index + 1).some((entry) => entry.kind === "video");
        const shouldAutoAdvance =
          index === activeIndex && hasLaterVideo && !advanceLocked;

        return (
          <div
            key={item.key}
            ref={(node) => setSlideNode(item.key, node)}
            data-feed-key={item.key}
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
                onFollowChange={onFollowChange}
                onSrcChange={(src) => onSrcChange?.(video.id, src)}
                onDeleted={(postId) => onVideoDeleted?.(video.id, postId)}
                onHideFromFeed={(postId) => onVideoDeleted?.(video.id, postId)}
                onCaptionChange={(nextCaption) =>
                  onCaptionChange?.(video.id, nextCaption)
                }
                onUiLockChange={setAdvanceLocked}
                onEnded={shouldAutoAdvance ? () => stepToNextVideo() : undefined}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#050510] text-white/40">
                <p className="text-sm font-bold">{video.creator.username}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
