"use client";

import { useEffect, useRef } from "react";
import { upsertLessonMediaPositionAction } from "../../learning/firstCourseActions";

type ContinueWatchingVideoProps = {
  src: string;
  lessonId: string;
  contentBlockId: string;
  initialSeconds?: number | null;
  caption?: string;
  provider?: string | null;
};

export default function ContinueWatchingVideo({
  src,
  lessonId,
  contentBlockId,
  initialSeconds,
  caption,
  provider,
}: ContinueWatchingVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || initialSeconds == null || initialSeconds <= 0) return;
    const seek = () => {
      try {
        el.currentTime = initialSeconds;
      } catch {
        /* ignore seek errors before metadata */
      }
    };
    if (el.readyState >= 1) seek();
    else el.addEventListener("loadedmetadata", seek, { once: true });
  }, [initialSeconds]);

  return (
    <figure className="overflow-hidden rounded-2xl border border-white/10 bg-black">
      <video
        ref={videoRef}
        controls
        playsInline
        preload="metadata"
        className="aspect-video w-full bg-black"
        src={src}
        data-provider={provider ?? undefined}
        onTimeUpdate={() => {
          const el = videoRef.current;
          if (!el) return;
          const now = Math.floor(el.currentTime);
          if (now - lastSentRef.current < 5) return;
          lastSentRef.current = now;
          const fd = new FormData();
          fd.set("lessonId", lessonId);
          fd.set("positionSeconds", String(now));
          fd.set("contentBlockId", contentBlockId);
          void upsertLessonMediaPositionAction(fd);
        }}
      >
        Your browser does not support video playback.
      </video>
      {caption ? (
        <figcaption className="px-3 py-2 text-xs leading-relaxed text-white/55">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
