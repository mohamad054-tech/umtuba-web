"use client";

import { useEffect, useRef, useState } from "react";
import type { WatchProgressEvent } from "../../components/video/VideoPlayer";
import { refreshWatchPlaybackAction } from "../../actions/loadWatchFeed";
import {
  PLAYBACK_DELETED_MESSAGE,
  PLAYBACK_EXPIRED_MESSAGE,
  PLAYBACK_UNAVAILABLE_MESSAGE,
  playbackStatusAfterRemintFailure,
  shouldAutoRemintPlayback,
} from "../../lib/video/signedPlaybackRetry";

type DiscoverNativeVideoProps = {
  src: string;
  poster?: string;
  active: boolean;
  label: string;
  /** Numeric post id for signed URL remint; omit when unknown. */
  postId?: number | null;
  onSrcChange?: (src: string) => void;
  onWatchProgress?: (event: WatchProgressEvent) => void;
};

type PlaybackStatus = "ok" | "expired" | "deleted" | "error";

/**
 * Discover playback: native controls, metadata preload only, playsInline.
 * Full media is only requested for mounted neighbors (see DiscoverFeed).
 * Expired signed URLs remint once, then show a clear retry error.
 */
export default function DiscoverNativeVideo({
  src,
  poster,
  active,
  label,
  postId = null,
  onSrcChange,
  onWatchProgress,
}: DiscoverNativeVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const loopCountRef = useRef(0);
  const onWatchProgressRef = useRef(onWatchProgress);
  onWatchProgressRef.current = onWatchProgress;
  const autoRemintAttemptedRef = useRef(false);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>("ok");
  const [retrying, setRetrying] = useState(false);
  const [playbackSrc, setPlaybackSrc] = useState(src);

  useEffect(() => {
    autoRemintAttemptedRef.current = false;
    setPlaybackStatus("ok");
    setPlaybackSrc(src);
  }, [postId]);

  useEffect(() => {
    setPlaybackSrc(src);
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (!active || playbackStatus !== "ok") {
      video.pause();
    }
  }, [active, playbackSrc, playbackStatus]);

  useEffect(() => {
    loopCountRef.current = 0;
  }, [playbackSrc]);

  useEffect(() => {
    const video = videoRef.current;
    const report = onWatchProgressRef.current;
    if (!video || !report || !active || playbackStatus !== "ok") {
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
  }, [active, playbackSrc, playbackStatus]);

  async function remintPlayback() {
    if (!postId || retrying) {
      return;
    }

    setRetrying(true);
    const result = await refreshWatchPlaybackAction(postId);
    setRetrying(false);

    if (!result.ok) {
      setPlaybackStatus(playbackStatusAfterRemintFailure(result.deleted));
      return;
    }

    setPlaybackSrc(result.src);
    onSrcChange?.(result.src);
    setPlaybackStatus("ok");
  }

  function handlePlaybackError() {
    if (
      shouldAutoRemintPlayback({
        hasPostId: Boolean(postId),
        autoRemintAttempted: autoRemintAttemptedRef.current,
      })
    ) {
      autoRemintAttemptedRef.current = true;
      void remintPlayback();
      return;
    }

    setPlaybackStatus(postId ? "expired" : "error");
  }

  const statusMessage =
    playbackStatus === "deleted"
      ? PLAYBACK_DELETED_MESSAGE
      : playbackStatus === "expired"
        ? PLAYBACK_EXPIRED_MESSAGE
        : playbackStatus === "error"
          ? PLAYBACK_UNAVAILABLE_MESSAGE
          : null;

  return (
    <div className="relative h-full w-full bg-black">
      {playbackStatus === "ok" ? (
        <video
          key={playbackSrc}
          ref={videoRef}
          className="h-full w-full object-contain"
          src={playbackSrc}
          poster={poster}
          controls
          playsInline
          preload="metadata"
          aria-label={label}
          onError={handlePlaybackError}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#050510] px-6 text-center">
          <p className="text-sm font-bold text-white/70">{statusMessage}</p>
          {playbackStatus !== "deleted" && postId ? (
            <button
              type="button"
              onClick={() => void remintPlayback()}
              disabled={retrying}
              className="watch-focus-ring rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/15 disabled:opacity-50"
            >
              {retrying ? "Refreshing…" : "Retry playback"}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
