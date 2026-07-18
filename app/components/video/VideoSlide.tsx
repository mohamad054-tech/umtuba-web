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
  onToggleMute: () => void;
  onOpenPanel: (panel: Exclude<WatchPanelId, null>) => void;
  onPostJourney: (video: WatchVideo) => void;
  onStatsChange?: (stats: Partial<DiscoverStats>) => void;
  onFlagsChange?: (flags: { likedByMe?: boolean; savedByMe?: boolean }) => void;
  onSrcChange?: (src: string) => void;
  slideRef?: (node: HTMLElement | null) => void;
};

export default function VideoSlide({
  video,
  active,
  muted,
  viewerId = null,
  forcePause = false,
  transitionLocked = false,
  onToggleMute,
  onOpenPanel,
  onPostJourney,
  onStatsChange,
  onFlagsChange,
  onSrcChange,
  slideRef,
}: VideoSlideProps) {
  const [playbackStatus, setPlaybackStatus] = useState<
    "ok" | "expired" | "deleted" | "error"
  >("ok");
  const [retrying, setRetrying] = useState(false);
  const sessionRef = useRef<WatchSessionSnapshot | null>(null);
  const wasActiveRef = useRef(false);

  async function handleRetryPlayback() {
    if (!video.postId || retrying) return;
    setRetrying(true);
    const result = await refreshWatchPlaybackAction(video.postId);
    setRetrying(false);

    if (!result.ok) {
      setPlaybackStatus(result.deleted ? "deleted" : "expired");
      return;
    }

    onSrcChange?.(result.src);
    setPlaybackStatus("ok");
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
        onPlaybackError={() =>
          setPlaybackStatus(video.postId ? "expired" : "error")
        }
        onRetryPlayback={
          video.postId ? () => void handleRetryPlayback() : undefined
        }
        onWatchProgress={
          video.source === "supabase" && video.postId
            ? handleWatchProgress
            : undefined
        }
      />
      <VideoOverlay
        video={video}
        viewerId={viewerId}
        transitionLocked={transitionLocked}
        onOpenPanel={onOpenPanel}
        onPostJourney={onPostJourney}
        onStatsChange={onStatsChange}
        onFlagsChange={handleFlagsChange}
      />
    </article>
  );
}
