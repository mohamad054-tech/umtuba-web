"use client";

import type { DemoVideo } from "../../data/videos";

type WatchAmbientBackgroundProps = {
  video: DemoVideo | null;
};

export default function WatchAmbientBackground({
  video,
}: WatchAmbientBackgroundProps) {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden bg-[#050510]"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[#050510]" />

      {video ? (
        <video
          key={video.id}
          className="absolute inset-0 h-full w-full scale-125 object-cover opacity-40 blur-3xl saturate-150"
          src={video.src}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
        />
      ) : null}

      <div className="absolute inset-0 bg-gradient-to-b from-[#050510]/55 via-[#050510]/75 to-[#050510]" />
      <div className="absolute left-[-12%] top-[-12%] h-[28rem] w-[28rem] rounded-full bg-blue-600/25 blur-3xl" />
      <div className="absolute right-[-10%] top-[18%] h-[26rem] w-[26rem] rounded-full bg-purple-600/22 blur-3xl" />
      <div className="absolute bottom-[-14%] left-[28%] h-[24rem] w-[24rem] rounded-full bg-emerald-500/10 blur-3xl" />
    </div>
  );
}
