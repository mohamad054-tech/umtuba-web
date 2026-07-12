"use client";

import type { DemoVideo } from "../../data/videos";
import type { WatchPanelId } from "./watchTypes";
import VideoActionRail from "./VideoActionRail";

type VideoOverlayProps = {
  video: DemoVideo;
  transitionLocked?: boolean;
  onOpenPanel: (panel: Exclude<WatchPanelId, null>) => void;
  onPostJourney: (video: DemoVideo) => void;
};

export default function VideoOverlay({
  video,
  transitionLocked = false,
  onOpenPanel,
  onPostJourney,
}: VideoOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-end">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/85 via-black/45 to-transparent" />

      <div className="watch-overlay-enter relative z-10 flex items-end justify-between gap-3 p-5 pb-7 md:gap-4 md:p-6 md:pb-8">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white font-black text-black shadow-[0_0_24px_rgba(255,255,255,0.18)]">
              {video.author.avatar}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-black tracking-tight">
                {video.author.name}
              </p>
              <p className="truncate text-sm text-white/55">
                {video.author.username}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-black text-white md:text-[15px]">
              {video.title}
            </p>
            <p className="mt-1 line-clamp-3 text-sm leading-6 text-white/80">
              {video.caption}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur">
              <span aria-hidden>📍</span>
              {video.location.city}, {video.location.country}
            </span>
            <button
              type="button"
              onClick={() => onOpenPanel("explore-city")}
              disabled={transitionLocked}
              className="pointer-events-auto watch-focus-ring rounded-full border border-blue-300/25 bg-blue-500/10 px-3 py-1.5 font-bold text-blue-100 hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Explore this city
            </button>
          </div>

          <p className="flex items-center gap-2 text-xs text-white/55">
            <span aria-hidden>♪</span>
            <span className="truncate">{video.music}</span>
          </p>

          <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.05] p-3 backdrop-blur-md">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-purple-200/80">
              AI summary
            </p>
            <p className="text-sm leading-6 text-white/75">{video.aiSummary}</p>
            <button
              type="button"
              onClick={() => onOpenPanel("ai")}
              disabled={transitionLocked}
              className="pointer-events-auto watch-focus-ring text-left text-xs font-bold text-white/55 underline-offset-2 hover:text-white hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
            >
              {video.translation} · Open AI panel
            </button>
          </div>

          <button
            type="button"
            onClick={() => onPostJourney(video)}
            disabled={transitionLocked}
            aria-busy={transitionLocked}
            className="pointer-events-auto watch-focus-ring inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-black text-black shadow-[0_12px_40px_rgba(255,255,255,0.18)] transition hover:scale-[1.015] hover:bg-white/95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 md:w-auto md:min-w-[220px]"
          >
            <span aria-hidden>🌍</span>
            {transitionLocked ? "Opening journey..." : "Post Journey"}
          </button>
        </div>

        <div className="pointer-events-auto">
          <VideoActionRail
            likes={video.demoStats.likes}
            comments={video.demoStats.comments}
            shares={video.demoStats.shares}
            saves={video.demoStats.saves}
            onOpenPanel={onOpenPanel}
          />
        </div>
      </div>
    </div>
  );
}
