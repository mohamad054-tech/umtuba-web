"use client";

import { toLiveUserFacingMessage } from "../../../lib/live";

type LiveStreamControlsProps = {
  muted: boolean;
  /** @deprecated Captions are Coming soon — kept for call-site compatibility. */
  captionsOn?: boolean;
  /** @deprecated Quality select is Coming soon — kept for call-site compatibility. */
  quality?: string;
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
  /** Ignored — captions are Coming soon. */
  onToggleCaptions?: () => void;
  /** Ignored — quality select is Coming soon. */
  onQualityChange?: (quality: string) => void;
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
  const safeMediaError = mediaError
    ? toLiveUserFacingMessage(mediaError)
    : null;

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
            aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}
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
            aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
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
            aria-label="Switch camera"
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
            aria-label={
              screenSharing ? "Stop screen share" : "Share screen"
            }
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

        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Captions coming soon"
          className={`${controlBtn} opacity-55`}
        >
          Captions · Coming soon
        </button>

        <span
          className={`${controlBtn} cursor-default opacity-55`}
          title="Quality controls coming soon"
          aria-disabled="true"
        >
          Quality · Coming soon
        </span>

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

      {safeMediaError ? (
        <p
          className="text-xs font-medium text-red-200/95"
          role="alert"
          data-testid="live-media-error"
        >
          {safeMediaError}
        </p>
      ) : null}
    </div>
  );
}
