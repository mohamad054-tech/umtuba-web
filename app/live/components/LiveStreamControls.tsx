"use client";

import { LIVE_QUALITY_OPTIONS, type LiveQuality } from "../types";

type LiveStreamControlsProps = {
  muted: boolean;
  captionsOn: boolean;
  quality: LiveQuality;
  isFullscreen: boolean;
  shareCopied: boolean;
  reportSent: boolean;
  isHost?: boolean;
  roomStatus?: string;
  onToggleMute: () => void;
  onToggleCaptions: () => void;
  onQualityChange: (quality: LiveQuality) => void;
  onToggleFullscreen: () => void;
  onShare: () => void;
  onReport: () => void;
  onGoLive?: () => void;
  onEndLive?: () => void;
  onLeave?: () => void;
};

const controlBtn =
  "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-bold text-white/75 transition hover:border-white/20 hover:bg-white/10 hover:text-white";

export default function LiveStreamControls({
  muted,
  captionsOn,
  quality,
  isFullscreen,
  shareCopied,
  reportSent,
  isHost = false,
  roomStatus,
  onToggleMute,
  onToggleCaptions,
  onQualityChange,
  onToggleFullscreen,
  onShare,
  onReport,
  onGoLive,
  onEndLive,
  onLeave,
}: LiveStreamControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {isHost && roomStatus === "idle" && onGoLive ? (
        <button
          type="button"
          onClick={onGoLive}
          className="inline-flex items-center gap-2 rounded-full bg-red-500 px-3.5 py-2 text-xs font-black text-white transition hover:bg-red-400"
        >
          Go live
        </button>
      ) : null}

      {isHost && roomStatus === "live" && onEndLive ? (
        <button
          type="button"
          onClick={onEndLive}
          className="inline-flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/20 px-3.5 py-2 text-xs font-black text-red-100 transition hover:bg-red-500/30"
        >
          End live
        </button>
      ) : null}

      {!isHost && onLeave ? (
        <button type="button" onClick={onLeave} className={controlBtn}>
          Leave
        </button>
      ) : null}

      <button type="button" onClick={onToggleMute} className={controlBtn}>
        {muted ? "Unmute" : "Mute"}
      </button>

      <button type="button" onClick={onToggleCaptions} className={controlBtn}>
        {captionsOn ? "Captions on" : "Captions"}
      </button>

      <label className={`${controlBtn} cursor-pointer`}>
        <span className="text-white/45">Quality</span>
        <select
          value={quality}
          onChange={(event) =>
            onQualityChange(event.target.value as LiveQuality)
          }
          className="bg-transparent text-white outline-none"
          aria-label="Stream quality"
        >
          {LIVE_QUALITY_OPTIONS.map((option) => (
            <option key={option} value={option} className="bg-[#0b0b18]">
              {option}
            </option>
          ))}
        </select>
      </label>

      <button type="button" onClick={onToggleFullscreen} className={controlBtn}>
        {isFullscreen ? "Exit full" : "Fullscreen"}
      </button>

      <button type="button" onClick={onShare} className={controlBtn}>
        {shareCopied ? "Link copied" : "Share"}
      </button>

      <button
        type="button"
        onClick={onReport}
        className={`${controlBtn} border-red-400/20 text-red-200/80 hover:border-red-400/40 hover:text-red-100`}
      >
        {reportSent ? "Reported" : "Report"}
      </button>
    </div>
  );
}
