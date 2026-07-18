"use client";

import { useEffect, useRef, useState } from "react";
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
  const [localViews] = useState(() => new Set<number>());
  const viewsSet = sessionViews ?? localViews;
  const postId = Number(video.id);
  const sessionRef = useRef<WatchSessionSnapshot | null>(null);
  const wasActiveRef = useRef(false);

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

  return (
    <article
      ref={slideRef}
      data-video-id={video.id}
      className={`video-snap-slide relative h-full w-full shrink-0 snap-start snap-always overflow-hidden bg-black ${
        active ? "watch-overlay-enter" : ""
      }`}
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

        <div className="relative z-10 flex items-end justify-between gap-3 p-5 pb-4 md:gap-4 md:p-6 md:pb-5">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="pointer-events-auto">
              <DiscoverCreatorInfo
                creator={video.creator}
                location={video.location}
                viewerId={viewerId}
                postId={video.id}
                onFollowChange={onFollowChange}
              />
            </div>
            <DiscoverCaption
              caption={video.caption}
              hashtags={video.hashtags}
            />
          </div>

          <div className="pointer-events-auto">
            <DiscoverActionRail
              postId={postId}
              stats={video.stats}
              likedByMe={video.likedByMe}
              savedByMe={video.savedByMe}
              caption={video.caption}
              returnPath={`${APP_ROUTES.discover}?post=${video.id}`}
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
