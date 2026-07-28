"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { WatchProgressEvent } from "../../components/video/VideoPlayer";
import { APP_ROUTES } from "../../lib/nav";
import { recordFeedViewOnce } from "../../lib/video/recordFeedView";
import {
  createEmptyWatchSession,
  flushWatchSession,
  mergeWatchProgress,
  type WatchSessionSnapshot,
} from "../../lib/video/recordWatchSignal";
import type { DiscoverStats, DiscoverVideo } from "../types";
import { HomeCircularArc } from "../../components/home/circularArc";
import { shouldMountHomeCircularArc } from "../../components/home/circularArc/homeCircularArcFlags";
import DiscoverActionRail from "./DiscoverActionRail";
import DiscoverCaption from "./DiscoverCaption";
import DiscoverCreatorInfo from "./DiscoverCreatorInfo";
import DiscoverLocationBanner from "./DiscoverLocationBanner";
import DiscoverNativeVideo from "./DiscoverNativeVideo";

type DiscoverVideoCardProps = {
  video: DiscoverVideo;
  active: boolean;
  viewerId?: string | null;
  /** Shared session dedupe for view recording (feed-owned). */
  sessionViews?: Set<number>;
  onComment: () => void;
  onStatsChange?: (stats: Partial<DiscoverStats>) => void;
  onFlagsChange?: (flags: { likedByMe?: boolean; savedByMe?: boolean }) => void;
  onFollowChange?: (creatorId: string, following: boolean) => void;
  onSrcChange?: (src: string) => void;
  slideRef?: (node: HTMLElement | null) => void;
};

export default function DiscoverVideoCard({
  video,
  active,
  viewerId = null,
  sessionViews,
  onComment,
  onStatsChange,
  onFlagsChange,
  onFollowChange,
  onSrcChange,
  slideRef,
}: DiscoverVideoCardProps) {
  const router = useRouter();
  const [localViews] = useState(() => new Set<number>());
  const viewsSet = sessionViews ?? localViews;
  const postId = Number(video.id);
  const showLeftActionRail = shouldMountHomeCircularArc();
  const sessionRef = useRef<WatchSessionSnapshot | null>(null);
  const wasActiveRef = useRef(false);
  const chromeRef = useRef<HTMLDivElement | null>(null);
  const rightRailRef = useRef<HTMLDivElement | null>(null);
  const leftRailRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!showLeftActionRail) return;
    const chrome = chromeRef.current;
    const right = rightRailRef.current;
    const left = leftRailRef.current;
    if (!chrome || !right || !left) return;

    const syncMirrorZone = () => {
      const chromeRect = chrome.getBoundingClientRect();
      const rightRect = right.getBoundingClientRect();
      // Approved drawing: start slightly above first right button,
      // end slightly below last right button.
      const extendPx = 8;
      left.style.top = `${Math.round(rightRect.top - chromeRect.top) - extendPx}px`;
      left.style.height = `${Math.round(rightRect.height) + extendPx * 2}px`;
    };

    syncMirrorZone();
    const ro = new ResizeObserver(syncMirrorZone);
    ro.observe(right);
    ro.observe(chrome);
    window.addEventListener("resize", syncMirrorZone);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncMirrorZone);
    };
  }, [showLeftActionRail, active]);

  useEffect(() => {
    if (!active || !Number.isInteger(postId) || postId <= 0) {
      return;
    }

    void recordFeedViewOnce(postId, viewsSet).then((result) => {
      if (result.ok) {
        onStatsChange?.({ views: result.views });
      }
    });
  }, [active, onStatsChange, postId, viewsSet]);

  useEffect(() => {
    if (!Number.isInteger(postId) || postId <= 0) {
      return;
    }

    if (active && !wasActiveRef.current) {
      sessionRef.current = createEmptyWatchSession(postId, "discover");
      if (video.likedByMe) {
        sessionRef.current.engagement.liked = true;
      }
      if (video.savedByMe) {
        sessionRef.current.engagement.saved = true;
      }
    }

    if (!active && wasActiveRef.current) {
      const session = sessionRef.current;
      sessionRef.current = null;
      void flushWatchSession(session);
    }

    wasActiveRef.current = active;
  }, [active, postId, video.likedByMe, video.savedByMe]);

  useEffect(() => {
    return () => {
      const session = sessionRef.current;
      sessionRef.current = null;
      void flushWatchSession(session);
    };
  }, []);

  function handleWatchProgress(event: WatchProgressEvent) {
    if (!sessionRef.current) return;
    sessionRef.current = mergeWatchProgress(sessionRef.current, event);
  }

  function handleFlagsChange(flags: {
    likedByMe?: boolean;
    savedByMe?: boolean;
  }) {
    if (sessionRef.current) {
      if (flags.likedByMe) {
        sessionRef.current.engagement.liked = true;
      }
      if (flags.savedByMe) {
        sessionRef.current.engagement.saved = true;
      }
    }
    onFlagsChange?.(flags);
  }

  function handleComment() {
    if (sessionRef.current) {
      sessionRef.current.engagement.commented = true;
    }
    onComment();
  }

  function handleTeaserOpen() {
    if (video.articleHref) {
      router.push(video.articleHref);
    }
  }

  return (
    <article
      ref={slideRef}
      data-video-id={video.id}
      className={`video-snap-slide relative h-full w-full shrink-0 snap-start snap-always overflow-hidden bg-black ${
        active ? "watch-overlay-enter" : ""
      }`}
      onDoubleClick={video.articleHref ? handleTeaserOpen : undefined}
    >
      <DiscoverNativeVideo
        src={video.src}
        poster={video.poster}
        active={active}
        label={video.caption}
        postId={Number.isInteger(postId) && postId > 0 ? postId : null}
        onSrcChange={onSrcChange}
        onWatchProgress={
          Number.isInteger(postId) && postId > 0
            ? handleWatchProgress
            : undefined
        }
      />

      {active ? (
        <DiscoverLocationBanner
          key={video.id}
          location={video.location}
        />
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-14 top-0 z-20 flex flex-col justify-end">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/85 via-black/45 to-transparent" />

        <div
          ref={chromeRef}
          className="relative z-10 flex items-end justify-between gap-3 p-5 pb-4 md:gap-4 md:p-6 md:pb-5"
        >
          {showLeftActionRail ? (
            // Bound to Right Action Rail (slight vertical extend).
            // Micro-align: whole rail left for creator breathing room.
            <div
              ref={leftRailRef}
              data-home-arc-rail="left-action"
              className="pointer-events-auto absolute left-[5px] z-10 overflow-visible md:left-[5px]"
            >
              <HomeCircularArc />
            </div>
          ) : null}

          <div
            className={`min-w-0 flex-1 space-y-3 ${
              showLeftActionRail ? "pl-16" : ""
            }`}
          >
            <div className="pointer-events-auto">
              <DiscoverCreatorInfo
                creator={video.creator}
                location={video.location}
                viewerId={viewerId}
                postId={video.id}
                articleId={video.articleId}
                onFollowChange={onFollowChange}
              />
            </div>
            <DiscoverCaption
              title={video.title || video.caption}
              caption={video.caption}
              hashtags={video.hashtags}
              articleHref={video.articleHref}
              articleTitle={video.articleTitle}
            />
            {video.articleHref ? (
              <button
                type="button"
                onClick={handleTeaserOpen}
                className="pointer-events-auto rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/90 transition hover:bg-white/15"
              >
                Read article
              </button>
            ) : null}
          </div>

          <div
            ref={rightRailRef}
            className="pointer-events-auto shrink-0"
            data-home-action-rail="right"
          >
            <DiscoverActionRail
              postId={postId}
              stats={video.stats}
              likedByMe={video.likedByMe}
              savedByMe={video.savedByMe}
              caption={video.caption}
              returnPath={`${APP_ROUTES.home}?post=${video.id}`}
              onComment={handleComment}
              onStatsChange={onStatsChange}
              onFlagsChange={handleFlagsChange}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
