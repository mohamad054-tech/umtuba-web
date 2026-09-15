"use client";

import { useEffect, useRef, useState } from "react";
import { refreshWatchPlaybackAction } from "../../actions/loadWatchFeed";
import { isPlayableHttpSrc } from "../../lib/video/playbackFetchPolicy";

type OnDemandSignedVideoProps = {
  postId: number;
  initialSrc?: string | null;
  className?: string;
  preload?: "none" | "metadata" | "auto";
  label?: string;
  autoRemint?: boolean;
};

type PlaybackCache = {
  key: string;
  src: string | null;
  failed: boolean;
};

/**
 * Client-only signed playback for non-feed surfaces (Life, saved, /feed).
 * SSR may omit the signed URL; this remints when the card is mounted.
 */
export default function OnDemandSignedVideo({
  postId,
  initialSrc = null,
  className,
  preload = "none",
  label,
  autoRemint = true,
}: OnDemandSignedVideoProps) {
  const requestKey = `${postId}:${initialSrc ?? ""}`;
  const [cache, setCache] = useState<PlaybackCache>({
    key: requestKey,
    src: null,
    failed: false,
  });
  if (cache.key !== requestKey) {
    setCache({ key: requestKey, src: null, failed: false });
  }

  const playableInitial = isPlayableHttpSrc(initialSrc) ? initialSrc!.trim() : "";
  const src = cache.src ?? playableInitial;
  const inFlightRef = useRef<string | null>(null);

  useEffect(() => {
    if (!autoRemint || cache.failed || isPlayableHttpSrc(src)) {
      return;
    }
    if (!Number.isInteger(postId) || postId <= 0) {
      return;
    }
    if (inFlightRef.current === requestKey) {
      return;
    }
    inFlightRef.current = requestKey;
    let cancelled = false;
    void refreshWatchPlaybackAction(postId)
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (result.ok) {
          setCache({ key: requestKey, src: result.src, failed: false });
          return;
        }
        setCache({ key: requestKey, src: null, failed: true });
      })
      .finally(() => {
        if (inFlightRef.current === requestKey) {
          inFlightRef.current = null;
        }
      });
    return () => {
      cancelled = true;
    };
  }, [autoRemint, cache.failed, postId, requestKey, src]);

  if (!isPlayableHttpSrc(src)) {
    return (
      <div className="flex min-h-48 items-center justify-center bg-black text-sm text-white/45">
        {cache.failed ? "Video unavailable." : "Loading video…"}
      </div>
    );
  }

  return (
    <video
      src={src}
      controls
      controlsList="nodownload"
      playsInline
      preload={preload}
      className={className}
      aria-label={label}
    />
  );
}
