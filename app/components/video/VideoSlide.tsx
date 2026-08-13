"use client";

import { useEffect, useRef, useState } from "react";
import type { DiscoverStats } from "../../discover/types";
import type { WatchVideo } from "../../watch/types";
import { refreshWatchPlaybackAction } from "../../actions/loadWatchFeed";
import {
  createEmptyWatchSession,
  flushWatchSession,
  mergeWatchProgress,
  type WatchSessionSnapshot,
} from "../../lib/video/recordWatchSignal";
import {
  playbackStatusAfterRemintFailure,
  shouldAutoRemintPlayback,
} from "../../lib/video/signedPlaybackRetry";
import type { WatchPanelId } from "./watchTypes";
import VideoOverlay from "./VideoOverlay";
import VideoPlayer, { type WatchProgressEvent } from "./VideoPlayer";

type VideoSlideProps = {
  video: WatchVideo;
  active: boolean;
  muted: boolean;
  viewerId?: string | null;
  forcePause?: boolean;
  transitionLocked?: boolean;
  shopProductCount?: number;
  shopShelfOpen?: boolean;
  onToggleMute: () => void;
  onOpenPanel: (panel: Exclude<WatchPanelId, null>) => void;
  onPostJourney: (video: WatchVideo) => void;
  onStatsChange?: (stats: Partial<DiscoverStats>) => void;
  onFlagsChange?: (flags: { likedByMe?: boolean; savedByMe?: boolean }) => void;
  onFollowChange?: (authorId: string, following: boolean) => void;
  onSrcChange?: (src: string) => void;
  onPlaybackTime?: (currentTimeMs: number) => void;
  onDeleted?: (postId: number) => void;
  restorePlaybackTimeSeconds?: number | null;
  restorePlaybackToken?: number;
  slideRef?: (node: HTMLElement | null) => void;
};

export default function VideoSlide({
  video,
  active,
  muted,
  viewerId = null,
  forcePause = false,
  transitionLocked = false,
  shopProductCount = 0,
  shopShelfOpen = false,
  onToggleMute,
  onOpenPanel,
  onPostJourney,
  onStatsChange,
  onFlagsChange,
  onFollowChange,
  onSrcChange,
  onPlaybackTime,
  onDeleted,
  restorePlaybackTimeSeconds,
  restorePlaybackToken,
  slideRef,
}: VideoSlideProps) {
  const [playbackStatus, setPlaybackStatus] = useState<
    "ok" | "expired" | "deleted" | "error"
  >("ok");
  const [retrying, setRetrying] = useState(false);
  const sessionRef = useRef<WatchSessionSnapshot | null>(null);
  const wasActiveRef = useRef(false);
  const autoRemintAttemptedRef = useRef(false);
  const lastReportedTimeRef = useRef(-1);
  const onPlaybackTimeRef = useRef(onPlaybackTime);
  onPlaybackTimeRef.current = onPlaybackTime;

  useEffect(() => {
    autoRemintAttemptedRef.current = false;
    setPlaybackStatus("ok");
  }, [video.id]);

  async function handleRetryPlayback() {
    if (!video.postId || retrying) return;
    setRetrying(true);
    const result = await refreshWatchPlaybackAction(video.postId);
    setRetrying(false);

    if (!result.ok) {
      setPlaybackStatus(playbackStatusAfterRemintFailure(result.deleted));
      return;
    }

    onSrcChange?.(result.src);
    setPlaybackStatus("ok");
  }

  function handlePlaybackError() {
    if (
      shouldAutoRemintPlayback({
        hasPostId: Boolean(video.postId),
        autoRemintAttempted: autoRemintAttemptedRef.current,
      })
    ) {
      autoRemintAttemptedRef.current = true;
      void handleRetryPlayback();
      return;
    }

    setPlaybackStatus(video.postId ? "expired" : "error");
  }

  useEffect(() => {
    if (video.source !== "supabase" || !video.postId) {
      return;
    }

    if (active && !wasActiveRef.current) {
      sessionRef.current = createEmptyWatchSession(video.postId, "watch");
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
  }, [active, video.likedByMe, video.postId, video.savedByMe, video.source]);

  useEffect(() => {
    return () => {
      const session = sessionRef.current;
      sessionRef.current = null;
      void flushWatchSession(session);
    };
  }, []);

  function handleWatchProgress(event: WatchProgressEvent) {
    if (sessionRef.current) {
      sessionRef.current = mergeWatchProgress(sessionRef.current, event);
    }

    if (!active || !onPlaybackTimeRef.current) {
      return;
    }

    // Throttle parent updates (~4/s) to avoid layout work during playback.
    if (Math.abs(event.currentTimeMs - lastReportedTimeRef.current) < 250) {
      return;
    }
    lastReportedTimeRef.current = event.currentTimeMs;
    onPlaybackTimeRef.current(event.currentTimeMs);
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

  return (
    <article
      ref={slideRef}
      data-video-id={video.id}
      className={`video-snap-slide relative h-full w-full shrink-0 snap-start snap-always overflow-hidden bg-black ${
        active ? "watch-overlay-enter" : ""
      }`}
    >
      <VideoPlayer
        key={video.src}
        src={video.src}
        poster={video.poster}
        active={active}
        muted={muted}
        forcePause={forcePause && active}
        onToggleMute={onToggleMute}
        playbackStatus={playbackStatus}
        onPlaybackError={handlePlaybackError}
        onRetryPlayback={
          video.postId ? () => void handleRetryPlayback() : undefined
        }
        onWatchProgress={
          (video.source === "supabase" && video.postId) || onPlaybackTime
            ? handleWatchProgress
            : undefined
        }
        restorePlaybackTimeSeconds={restorePlaybackTimeSeconds}
        restorePlaybackToken={restorePlaybackToken}
      />
      <VideoOverlay
        video={video}
        viewerId={viewerId}
        transitionLocked={transitionLocked}
        shopProductCount={active ? shopProductCount : 0}
        shopShelfOpen={active ? shopShelfOpen : false}
        onOpenPanel={onOpenPanel}
        onPostJourney={onPostJourney}
        onStatsChange={onStatsChange}
        onFlagsChange={handleFlagsChange}
        onFollowChange={onFollowChange}
        onDeleted={onDeleted}
      />
    </article>
  );
}
