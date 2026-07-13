"use client";

import { useEffect, useRef } from "react";

type DiscoverNativeVideoProps = {
  src: string;
  poster?: string;
  active: boolean;
  label: string;
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
}: DiscoverNativeVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (!active) {
      video.pause();
    }
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
