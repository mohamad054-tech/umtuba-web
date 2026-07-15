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
  collaborationOpen?: boolean;
  /** Local A/V publish controls when on stage */
  isPublisher?: boolean;
  canShareScreen?: boolean;
  micEnabled?: boolean;
  cameraEnabled?: boolean;
  screenSharing?: boolean;
  /** LiveKit room must be connected before device toggles run. */
  mediaConnected?: boolean;
  /** True while getUserMedia / LiveKit device ops are in flight. */
  mediaDeviceBusy?: boolean;
  mediaBusyKind?: "mic" | "camera" | "screen" | null;
  mediaError?: string | null;
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
  onToggleScreenShare?: () => void;
  onSwitchCamera?: () => void;
  onStartSession?: () => void;
  onToggleMute: () => void;
  onToggleCaptions: () => void;
  onQualityChange: (quality: LiveQuality) => void;
  onToggleFullscreen: () => void;
  onShare: () => void;
  onReport: () => void;
  onOpenCollaboration?: () => void;
  onGoLive?: () => void;
  onEndLive?: () => void;
  onLeave?: () => void;
};

const controlBtn =
  "pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-bold text-white/75 transition hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-white/10 disabled:hover:bg-white/5 disabled:hover:text-white/75 aria-disabled:cursor-wait aria-disabled:opacity-70";

export default function LiveStreamControls({
  muted,
  captionsOn,
  quality,
  isFullscreen,
  shareCopied,
  reportSent,
  isHost = false,
  roomStatus,
  collaborationOpen = false,
  isPublisher = false,
  canShareScreen = false,
  micEnabled = false,
  cameraEnabled = false,
  screenSharing = false,
  mediaConnected = false,
  mediaDeviceBusy = false,
  mediaBusyKind = null,
  mediaError = null,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onSwitchCamera,
  onStartSession,
  onToggleMute,
  onToggleCaptions,
  onQualityChange,
  onToggleFullscreen,
  onShare,
  onReport,
  onOpenCollaboration,
  onGoLive,
  onEndLive,
  onLeave,
}: LiveStreamControlsProps) {
  // Prefer aria-disabled so clicks still fire and can surface status/errors
  // instead of silently ignoring input when media is connecting/busy.
  const deviceControlsBlocked = !mediaConnected || mediaDeviceBusy;

  return (
    <div
      className="space-y-2"
      data-media-connected={mediaConnected ? "true" : "false"}
      data-media-busy={mediaDeviceBusy ? "true" : "false"}
    >
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

        {isHost && roomStatus === "live" && onStartSession ? (
          <button type="button" onClick={onStartSession} className={controlBtn}>
            New session
          </button>
        ) : null}

        {!isHost && onLeave ? (
          <button type="button" onClick={onLeave} className={controlBtn}>
            Leave
          </button>
        ) : null}

        {isPublisher && onToggleMic ? (
          <button
            type="button"
            data-testid="live-toggle-mic"
            onClick={onToggleMic}
            aria-disabled={deviceControlsBlocked}
            aria-busy={mediaDeviceBusy}
            aria-pressed={micEnabled}
            title={
              !mediaConnected
                ? "Waiting for live media connection…"
                : mediaDeviceBusy
                  ? "Requesting device access…"
                  : undefined
            }
            className={controlBtn}
          >
            {mediaBusyKind === "mic"
              ? "Mic…"
              : micEnabled
                ? "Mic on"
                : "Mic off"}
          </button>
        ) : null}

        {isPublisher && onToggleCamera ? (
          <button
            type="button"
            data-testid="live-toggle-camera"
            onClick={onToggleCamera}
            aria-disabled={deviceControlsBlocked}
            aria-busy={mediaBusyKind === "camera"}
            aria-pressed={cameraEnabled}
            title={
              !mediaConnected
                ? "Waiting for live media connection…"
                : mediaDeviceBusy
                  ? "Requesting device access…"
                  : undefined
            }
            className={controlBtn}
          >
            {mediaBusyKind === "camera"
              ? "Camera…"
              : cameraEnabled
                ? "Camera on"
                : "Camera off"}
          </button>
        ) : null}

        {isPublisher && onSwitchCamera ? (
          <button
            type="button"
            onClick={onSwitchCamera}
            aria-disabled={deviceControlsBlocked || !cameraEnabled}
            className={controlBtn}
          >
            Flip cam
          </button>
        ) : null}

        {canShareScreen && onToggleScreenShare ? (
          <button
            type="button"
            data-testid="live-toggle-screen"
            onClick={onToggleScreenShare}
            aria-disabled={deviceControlsBlocked}
            aria-busy={mediaBusyKind === "screen"}
            aria-pressed={screenSharing}
            className={controlBtn}
          >
            {mediaBusyKind === "screen"
              ? "Share…"
              : screenSharing
                ? "Stop share"
                : "Share screen"}
          </button>
        ) : null}

        {onOpenCollaboration ? (
          <button
            type="button"
            onClick={onOpenCollaboration}
            aria-pressed={collaborationOpen}
            className={`${controlBtn} ${
              collaborationOpen
                ? "border-sky-400/35 bg-sky-500/15 text-sky-100"
                : ""
            }`}
          >
            <span aria-hidden>📎</span>
            Collaboration
          </button>
        ) : null}

        <button type="button" onClick={onToggleMute} className={controlBtn}>
          {muted ? "Unmute playback" : "Mute playback"}
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

      {isPublisher && !mediaConnected ? (
        <p className="text-xs font-medium text-amber-200/90" role="status">
          Connecting to live media… Mic and camera unlock when connected.
        </p>
      ) : null}

      {isPublisher && mediaConnected && mediaDeviceBusy ? (
        <p className="text-xs font-medium text-amber-200/90" role="status">
          Waiting for camera/microphone permission…
        </p>
      ) : null}

      {mediaError ? (
        <p
          className="text-xs font-medium text-red-200/95"
          role="alert"
          data-testid="live-media-error"
        >
          {mediaError}
        </p>
      ) : null}
    </div>
  );
}
