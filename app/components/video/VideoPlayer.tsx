"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { useTranslation } from "../i18n";
import {
  pauseInactiveVideo,
  playActiveVideo,
} from "../../../lib/video/playActiveVideo";
import {
  isPlayableHttpSrc,
  resolveWatchMediaPreload,
} from "../../lib/video/playbackFetchPolicy";
import WatchFloatingControls from "./WatchFloatingControls";

export type WatchProgressEvent = {
  currentTimeMs: number;
  durationMs: number;
  completed: boolean;
  loopCount: number;
};

type VideoPlayerProps = {
  src: string;
  poster?: string;
  active: boolean;
  muted: boolean;
  forcePause?: boolean;
  onToggleMute: () => void;
  /** Sync parent mute UI when the browser forces muted autoplay. */
  onAutoplayMuted?: () => void;
  /** Remint signed URL when playback fails (expired / deleted). */
  onPlaybackError?: () => void;
  playbackStatus?: "ok" | "expired" | "deleted" | "error";
  onRetryPlayback?: () => void;
  /** Optional watch-signal telemetry (Discover/Watch recommendation V1). */
  onWatchProgress?: (event: WatchProgressEvent) => void;
  restorePlaybackTimeSeconds?: number | null;
  restorePlaybackToken?: number;
};

export default function VideoPlayer({
  src,
  poster,
  active,
  muted,
  forcePause = false,
  onToggleMute,
  onAutoplayMuted,
  onPlaybackError,
  playbackStatus = "ok",
  onRetryPlayback,
  onWatchProgress,
  restorePlaybackTimeSeconds = null,
  restorePlaybackToken = 0,
}: VideoPlayerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [pausedByUser, setPausedByUser] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [flashIcon, setFlashIcon] = useState<"play" | "pause" | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const loopCountRef = useRef(0);
  const playGenerationRef = useRef(0);
  const onWatchProgressRef = useRef(onWatchProgress);
  onWatchProgressRef.current = onWatchProgress;

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (!active || playbackStatus !== "ok") {
      playGenerationRef.current += 1;
      pauseInactiveVideo(video);
      return;
    }

    if (pausedByUser) {
      playGenerationRef.current += 1;
      video.pause();
      return;
    }

    const generation = playGenerationRef.current + 1;
    playGenerationRef.current = generation;
    void playActiveVideo(video, muted).then((result) => {
      if (playGenerationRef.current !== generation) {
        return;
      }
      if (result === "muted_fallback") {
        onAutoplayMuted?.();
      }
    });
  }, [active, muted, pausedByUser, src, playbackStatus, onAutoplayMuted]);

  useEffect(() => {
    if (!forcePause || !active) {
      return;
    }

    const video = videoRef.current;

    if (!video) {
      return;
    }

    pauseInactiveVideo(video);

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

  useEffect(() => {
    loopCountRef.current = 0;
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (
      !video ||
      !active ||
      restorePlaybackTimeSeconds === null ||
      !Number.isFinite(restorePlaybackTimeSeconds) ||
      restorePlaybackTimeSeconds < 0
    ) {
      return;
    }
    const seek = () => {
      const max = Number.isFinite(video.duration)
        ? Math.max(0, video.duration - 0.1)
        : restorePlaybackTimeSeconds;
      video.currentTime = Math.min(restorePlaybackTimeSeconds, max);
    };
    if (video.readyState >= 1) {
      seek();
      return;
    }
    video.addEventListener("loadedmetadata", seek, { once: true });
    return () => video.removeEventListener("loadedmetadata", seek);
  }, [
    active,
    restorePlaybackTimeSeconds,
    restorePlaybackToken,
    src,
  ]);

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
  }, [active, playbackStatus, src]);

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
      void playActiveVideo(video, muted).then((result) => {
        if (result === "muted_fallback") {
          onAutoplayMuted?.();
        }
      });
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
      ? t("watch.deleted")
      : playbackStatus === "expired"
        ? t("watch.linkExpired")
        : playbackStatus === "error"
          ? t("watch.unableToPlay")
          : null;

  const playable = isPlayableHttpSrc(src) && playbackStatus === "ok";

  return (
    <div className="relative h-full w-full bg-black">
      {playable ? (
        <video
          ref={videoRef}
          className="h-full w-full cursor-pointer object-cover"
          src={src}
          poster={poster}
          playsInline
          loop
          muted={muted}
          preload={resolveWatchMediaPreload(active)}
          onClick={handleSurfaceClick}
          onLoadedData={() => setIsReady(true)}
          onWaiting={() => setIsReady(false)}
          onCanPlay={() => setIsReady(true)}
          onPlay={() => setIsPaused(false)}
          onPause={() => setIsPaused(true)}
          onError={() => onPlaybackError?.()}
        />
      ) : playbackStatus !== "ok" ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#050510] px-6 text-center">
          <p className="text-sm font-bold text-white/70">{statusMessage}</p>
          {playbackStatus !== "deleted" && onRetryPlayback ? (
            <button
              type="button"
              onClick={onRetryPlayback}
              className="watch-focus-ring rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/15"
            >
              {t("watch.retryPlayback")}
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        role="button"
        tabIndex={0}
        className="sr-only"
        aria-label={isPaused ? t("watch.playVideo") : t("watch.pauseVideo")}
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

      {((!playable && playbackStatus === "ok") ||
        (!isReady && active && playable)) ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/35">
          <p
            className="rounded-full border border-white/15 bg-black/50 px-4 py-2 text-sm font-bold text-white/70 backdrop-blur"
            role="status"
            aria-live="polite"
          >
            {t("watch.loadingVideo")}
          </p>
        </div>
      ) : null}

      <WatchFloatingControls
        muted={muted}
        onToggleMute={onToggleMute}
        unmuteLabel={t("watch.unmute")}
        muteLabel={t("watch.mute")}
      />
    </div>
  );
}
