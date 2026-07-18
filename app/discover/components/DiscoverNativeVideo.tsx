"use client";

import { useEffect, useRef } from "react";
import type { WatchProgressEvent } from "../../components/video/VideoPlayer";

type DiscoverNativeVideoProps = {
  src: string;
  poster?: string;
  active: boolean;
  label: string;
  onWatchProgress?: (event: WatchProgressEvent) => void;
};

/**
 * Discover playback: native controls, metadata preload only, playsInline.
 * Full media is only requested for mounted neighbors (see DiscoverFeed).
 */
export default function DiscoverNativeVideo({
  src,
  poster,
  active,
  label,
  onWatchProgress,
}: DiscoverNativeVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const loopCountRef = useRef(0);
  const onWatchProgressRef = useRef(onWatchProgress);
  onWatchProgressRef.current = onWatchProgress;

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (!active) {
      video.pause();
    }
  }, [active, src]);

  useEffect(() => {
    loopCountRef.current = 0;
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    const report = onWatchProgressRef.current;
    if (!video || !report || !active) {
      return;
    }

    const emit = (completed = false) => {
      const durationMs = Number.isFinite(video.duration)
        ? Math.max(0, video.duration * 1000)
        : 0;
      const currentTimeMs = Number.isFinite(video.currentTime)
        ? Math.max(0, video.currentTime * 1000)
        : 0;
      report({
        currentTimeMs,
        durationMs,
        completed:
          completed ||
          (durationMs > 0 && currentTimeMs / durationMs >= 0.92),
        loopCount: loopCountRef.current,
      });
    };

    const onTimeUpdate = () => emit(false);
    const onEnded = () => {
      loopCountRef.current += 1;
      emit(true);
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);
    const interval = window.setInterval(() => emit(false), 2000);

    return () => {
      emit(false);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
      window.clearInterval(interval);
    };
  }, [active, src]);

  return (
    <div className="relative h-full w-full bg-black">
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        src={src}
        poster={poster}
        controls
        playsInline
        preload="metadata"
        aria-label={label}
      />
    </div>
  );
}
