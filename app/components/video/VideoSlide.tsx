"use client";

import { useState } from "react";
import type { DiscoverStats } from "../../discover/types";
import type { WatchVideo } from "../../watch/types";
import { refreshWatchPlaybackAction } from "../../actions/loadWatchFeed";
import type { WatchPanelId } from "./watchTypes";
import VideoOverlay from "./VideoOverlay";
import VideoPlayer from "./VideoPlayer";

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
      />
      <VideoOverlay
        video={video}
        viewerId={viewerId}
        transitionLocked={transitionLocked}
        onOpenPanel={onOpenPanel}
        onPostJourney={onPostJourney}
        onStatsChange={onStatsChange}
        onFlagsChange={onFlagsChange}
      />
    </article>
  );
}
