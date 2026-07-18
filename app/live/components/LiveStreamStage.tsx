"use client";

import { memo, type RefObject } from "react";
import type {
  FloatingLiveReaction,
  LiveRoom,
  LiveStageLayoutMode,
} from "../types";
import type { LiveStageTile } from "../hooks/useLiveMediaSession";
import LiveBadge from "./LiveBadge";
import LiveFloatingReactions from "./LiveFloatingReactions";
import LiveMediaStage from "./LiveMediaStage";
import LiveViewerCount from "./LiveViewerCount";

type LiveStreamStageProps = {
  room: LiveRoom;
  muted: boolean;
  /** LiveKit connection quality / status label when media is connected. */
  quality: string | null;
  isFullscreen: boolean;
  stageRef: RefObject<HTMLDivElement | null>;
  floatingReactions?: FloatingLiveReaction[];
  viewerCount?: number | null;
  watchingSource?: "presence" | "pending" | "error";
  mediaTiles?: LiveStageTile[];
  activeSpeakerId?: string | null;
  mediaConnectionLabel?: string;
  mediaConnectionState?: string;
  mediaError?: string | null;
  layoutMode?: LiveStageLayoutMode;
};

function LiveStreamStageComponent({
  room,
  muted,
  quality,
  isFullscreen,
  stageRef,
  floatingReactions = [],
  viewerCount = null,
  watchingSource = "pending",
  mediaTiles = [],
  activeSpeakerId = null,
  mediaConnectionLabel = "Offline",
  mediaConnectionState = "idle",
  mediaError = null,
  layoutMode = "auto",
}: LiveStreamStageProps) {
  const hasMedia = mediaTiles.length > 0;

  return (
    <div
      ref={stageRef}
      className={`relative overflow-hidden border border-white/10 bg-[#080816]/80 shadow-[0_0_60px_rgba(37,99,238,0.12)] backdrop-blur-xl ${
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none border-0"
          : "aspect-video w-full rounded-[24px] sm:rounded-[28px] md:rounded-[32px]"
      }`}
    >
      {!hasMedia ? (
        <>
          <div
            className={`absolute inset-0 bg-gradient-to-br ${room.previewGradient}`}
          />
          <div className="pointer-events-none absolute inset-0">
            <div
              className={`absolute -left-16 top-1/4 h-56 w-56 rounded-full blur-3xl ${room.previewAccent}`}
            />
            <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(5,5,16,0.55)_100%)]" />
          </div>
        </>
      ) : (
        <div className="absolute inset-0 bg-black" />
      )}

      <LiveMediaStage
        tiles={mediaTiles}
        activeSpeakerId={activeSpeakerId}
        pinnedParticipantId={room.pinnedParticipantId}
        layoutMode={layoutMode}
        connectionLabel={mediaConnectionLabel}
        connectionState={mediaConnectionState}
        mediaError={mediaError}
        placeholderTitle={room.previewLabel}
        placeholderSubtitle={
          room.status === "live"
            ? "Waiting for on-stage video — chat and presence stay live."
            : "Go live to start the media stage."
        }
      />

      <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2 sm:left-4 sm:top-4 md:left-5 md:top-5">
        <LiveBadge size="md" />
        <LiveViewerCount count={viewerCount} source={watchingSource} />
        {quality ? (
          <span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55 backdrop-blur-md">
            {quality}
          </span>
        ) : null}
        <span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45 backdrop-blur-md">
          {room.status === "live" ? "Live media" : room.status}
        </span>
      </div>

      <LiveFloatingReactions reactions={floatingReactions} variant="stage" />

      {muted ? (
        <div className="absolute bottom-4 left-4 z-10 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-xs font-bold text-white/70 backdrop-blur-md md:bottom-5 md:left-5">
          Muted
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/70 to-transparent" />
    </div>
  );
}

const LiveStreamStage = memo(LiveStreamStageComponent);
export default LiveStreamStage;
