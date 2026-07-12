"use client";

import type { DemoVideo } from "../../data/videos";
import type { WatchPanelId } from "./watchTypes";
import VideoOverlay from "./VideoOverlay";
import VideoPlayer from "./VideoPlayer";

type VideoSlideProps = {
  video: DemoVideo;
  active: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onOpenPanel: (panel: Exclude<WatchPanelId, null>) => void;
  slideRef?: (node: HTMLElement | null) => void;
};

export default function VideoSlide({
  video,
  active,
  muted,
  onToggleMute,
  onOpenPanel,
  slideRef,
}: VideoSlideProps) {
  return (
    <article
      ref={slideRef}
      data-video-id={video.id}
      className={`video-snap-slide relative h-full w-full shrink-0 snap-start snap-always overflow-hidden bg-black ${
        active ? "watch-overlay-enter" : ""
      }`}
    >
      <VideoPlayer
        src={video.src}
        poster={video.poster}
        active={active}
        muted={muted}
        onToggleMute={onToggleMute}
      />
      <VideoOverlay video={video} onOpenPanel={onOpenPanel} />
    </article>
  );
}
