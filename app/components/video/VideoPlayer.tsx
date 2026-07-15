"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import WatchFloatingControls from "./WatchFloatingControls";

type VideoPlayerProps = {
  src: string;
  poster?: string;
  active: boolean;
  muted: boolean;
  forcePause?: boolean;
  onToggleMute: () => void;
  /** Remint signed URL when playback fails (expired / deleted). */
  onPlaybackError?: () => void;
  playbackStatus?: "ok" | "expired" | "deleted" | "error";
  onRetryPlayback?: () => void;
};

export default function VideoPlayer({
  src,
  poster,
  active,
  muted,
  forcePause = false,
  onToggleMute,
  onPlaybackError,
  playbackStatus = "ok",
  onRetryPlayback,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [pausedByUser, setPausedByUser] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [flashIcon, setFlashIcon] = useState<"play" | "pause" | null>(null);
  const flashTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (!active || playbackStatus !== "ok") {
      video.pause();
      return;
    }

    if (pausedByUser) {
      return;
    }

    video.muted = muted;
    void video.play().catch(() => undefined);
  }, [active, muted, pausedByUser, src, playbackStatus]);

  useEffect(() => {
    if (!forcePause || !active) {
      return;
    }

    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.pause();

    const frame = requestAnimationFrame(() => {
      setPausedByUser(true);
    });

    return () => cancelAnimationFrame(frame);
  }, [forcePause, active]);

  useEffect(() => {
    if (active) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      setPausedByUser(false);
      setFlashIcon(null);
    });

    return () => cancelAnimationFrame(frame);
  }, [active]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current !== null) {
        window.clearTimeout(flashTimerRef.current);
      }
    };
  }, []);

  function showFlash(icon: "play" | "pause") {
    setFlashIcon(icon);

    if (flashTimerRef.current !== null) {
      window.clearTimeout(flashTimerRef.current);
    }

    flashTimerRef.current = window.setTimeout(() => {
      setFlashIcon(null);
    }, 520);
  }

  function togglePlayback() {
    if (playbackStatus !== "ok") {
      return;
    }

    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (video.paused) {
      setPausedByUser(false);
      void video.play().catch(() => undefined);
      showFlash("play");
      return;
    }

    video.pause();
    setPausedByUser(true);
    showFlash("pause");
  }

  function handleSurfaceClick(event: MouseEvent<HTMLVideoElement>) {
    event.preventDefault();
    togglePlayback();
  }

  function handleSurfaceKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      togglePlayback();
    }
  }

  const statusMessage =
    playbackStatus === "deleted"
      ? "This video was deleted."
      : playbackStatus === "expired"
        ? "Playback link expired."
        : playbackStatus === "error"
          ? "Unable to play this video."
          : null;

  return (
    <div className="relative h-full w-full bg-black">
      {playbackStatus === "ok" ? (
        <video
          ref={videoRef}
          className="h-full w-full cursor-pointer object-cover"
          src={src}
          poster={poster}
          playsInline
          loop
          muted={muted}
          preload={active ? "auto" : "metadata"}
          onClick={handleSurfaceClick}
          onLoadedData={() => setIsReady(true)}
          onWaiting={() => setIsReady(false)}
          onCanPlay={() => setIsReady(true)}
          onPlay={() => setIsPaused(false)}
          onPause={() => setIsPaused(true)}
          onError={() => onPlaybackError?.()}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#050510] px-6 text-center">
          <p className="text-sm font-bold text-white/70">{statusMessage}</p>
          {playbackStatus !== "deleted" && onRetryPlayback ? (
            <button
              type="button"
              onClick={onRetryPlayback}
              className="watch-focus-ring rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/15"
            >
              Retry playback
            </button>
          ) : null}
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        className="sr-only"
        aria-label={isPaused ? "Play video" : "Pause video"}
        onKeyDown={handleSurfaceKeyDown}
        onClick={() => togglePlayback()}
      />

      {flashIcon ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div className="watch-playback-flash flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-md">
            {flashIcon === "play" ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
              </svg>
            )}
          </div>
        </div>
      ) : null}

      {!isReady && active && playbackStatus === "ok" ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/35">
          <p className="rounded-full border border-white/15 bg-black/50 px-4 py-2 text-sm font-bold text-white/70 backdrop-blur">
            Loading...
          </p>
        </div>
      ) : null}

      <WatchFloatingControls muted={muted} onToggleMute={onToggleMute} />
    </div>
  );
}
