"use client";

import { useEffect, useId, useRef } from "react";
import {
  formatTrimTimestamp,
  normalizeTrimRange,
  type VideoTrimRange,
} from "../../../lib/media/videoTrim";

type VideoTrimTimelineProps = {
  videoSrc: string;
  durationMs: number;
  value: VideoTrimRange;
  onChange: (next: VideoTrimRange) => void;
  disabled?: boolean;
};

export default function VideoTrimTimeline({
  videoSrc,
  durationMs,
  value,
  onChange,
  disabled = false,
}: VideoTrimTimelineProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inId = useId();
  const outId = useId();
  const previewId = useId();
  const range = normalizeTrimRange(value, durationMs) ?? {
    inMs: 0,
    outMs: Math.max(250, durationMs),
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const startSec = range.inMs / 1000;
    const endSec = range.outMs / 1000;

    const clampPlayhead = () => {
      if (video.currentTime < startSec - 0.05) {
        video.currentTime = startSec;
      }
      if (video.currentTime >= endSec) {
        video.currentTime = startSec;
        if (!video.paused) {
          void video.play().catch(() => undefined);
        }
      }
    };

    const onLoaded = () => {
      video.currentTime = startSec;
    };

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("timeupdate", clampPlayhead);
    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("timeupdate", clampPlayhead);
    };
  }, [range.inMs, range.outMs, videoSrc]);

  function commit(next: { inMs?: number; outMs?: number }) {
    if (disabled) return;
    const normalized = normalizeTrimRange(
      { inMs: next.inMs ?? range.inMs, outMs: next.outMs ?? range.outMs },
      durationMs
    );
    if (normalized) onChange(normalized);
  }

  const max = Math.max(durationMs, range.outMs);

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
          Timeline
        </p>
        <p className="text-xs text-white/55" id={previewId}>
          IN {formatTrimTimestamp(range.inMs)} · OUT {formatTrimTimestamp(range.outMs)}
        </p>
      </div>

      <video
        ref={videoRef}
        src={videoSrc}
        className="aspect-[9/16] max-h-64 w-full rounded-xl bg-black object-contain"
        playsInline
        muted
        controls
        aria-describedby={previewId}
      />

      <div className="space-y-2">
        <label htmlFor={inId} className="block text-xs font-bold text-white/70">
          In point
        </label>
        <input
          id={inId}
          type="range"
          min={0}
          max={max}
          step={50}
          value={range.inMs}
          disabled={disabled}
          onChange={(event) => commit({ inMs: Number(event.target.value) })}
          className="w-full accent-sky-400"
        />
        <label htmlFor={outId} className="block text-xs font-bold text-white/70">
          Out point
        </label>
        <input
          id={outId}
          type="range"
          min={0}
          max={max}
          step={50}
          value={range.outMs}
          disabled={disabled}
          onChange={(event) => commit({ outMs: Number(event.target.value) })}
          className="w-full accent-sky-400"
        />
      </div>
      <p className="text-xs text-white/40">
        Preview plays only the selected range. Cancel leaves the live video unchanged.
      </p>
    </div>
  );
}
