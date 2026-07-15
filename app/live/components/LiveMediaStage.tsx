"use client";

import { memo, useEffect, useRef } from "react";
import type { LiveStageLayoutMode } from "../types";
import type { LiveStageTile } from "../hooks/useLiveMediaSession";

type LiveMediaStageProps = {
  tiles: LiveStageTile[];
  activeSpeakerId: string | null;
  pinnedParticipantId?: string | null;
  layoutMode?: LiveStageLayoutMode;
  connectionLabel: string;
  connectionState: string;
  mediaError: string | null;
  placeholderTitle: string;
  placeholderSubtitle: string;
};

function TileVideo({ tile }: { tile: LiveStageTile }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    tile.attachVideo(videoRef.current);
    if (!tile.isLocal) {
      tile.attachAudio(audioRef.current);
    }
    return () => {
      tile.attachVideo(null);
      if (!tile.isLocal) {
        tile.attachAudio(null);
      }
    };
  }, [tile]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black/60">
      {tile.hasVideo || tile.isScreenShare ? (
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          autoPlay
          muted={tile.isLocal}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950">
          <span className="text-2xl font-black text-white/40">
            {tile.name.slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}
      {!tile.isLocal ? (
        <audio ref={audioRef} autoPlay playsInline />
      ) : null}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
        <p className="truncate text-[10px] font-bold text-white/85">
          {tile.name}
          {tile.isSpeaking ? " · speaking" : ""}
          {tile.isLocal ? " · you" : ""}
        </p>
      </div>
    </div>
  );
}

function layoutClass(count: number): string {
  if (count <= 1) {
    return "grid-cols-1 grid-rows-1";
  }
  if (count === 2) {
    return "grid-cols-1 grid-rows-2 sm:grid-cols-2 sm:grid-rows-1";
  }
  if (count <= 4) {
    return "grid-cols-2 grid-rows-2";
  }
  if (count <= 6) {
    return "grid-cols-2 grid-rows-3 sm:grid with-cols-3 sm:grid-rows-2";
  }
  return "grid-cols-2 grid-rows-4 sm:grid-cols-4 sm:grid-rows-2";
}

function LiveMediaStageComponent({
  tiles,
  activeSpeakerId,
  pinnedParticipantId,
  layoutMode = "auto",
  connectionLabel,
  connectionState,
  mediaError,
  placeholderTitle,
  placeholderSubtitle,
}: LiveMediaStageProps) {
  const faceTiles = tiles.filter((t) => !t.isScreenShare);
  const screenTiles = tiles.filter((t) => t.isScreenShare);

  const focusId =
    layoutMode === "pinned" && pinnedParticipantId
      ? pinnedParticipantId
      : layoutMode === "active_speaker" || layoutMode === "auto"
        ? activeSpeakerId
        : null;

  const ordered = [...faceTiles].sort((a, b) => {
    if (focusId) {
      if (a.identity === focusId) return -1;
      if (b.identity === focusId) return 1;
    }
    if (a.isSpeaking !== b.isSpeaking) {
      return a.isSpeaking ? -1 : 1;
    }
    return 0;
  });

  const count = ordered.length;
  const useMobileStrip = count >= 5;

  if (count === 0 && screenTiles.length === 0) {
    return (
      <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center px-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-red-300/90">
          UMTUBA Live Stage
        </p>
        <h2 className="mt-2 max-w-xl text-xl font-black tracking-tight text-white sm:text-2xl md:text-4xl">
          {placeholderTitle}
        </h2>
        <p className="mt-2 max-w-md text-xs leading-5 text-white/55 sm:text-sm">
          {connectionState === "connecting" ||
          connectionState === "reconnecting"
            ? `${connectionLabel}…`
            : mediaError
              ? mediaError
              : placeholderSubtitle}
        </p>
      </div>
    );
  }

  const gridLayout =
    count <= 1
      ? "grid-cols-1 grid-rows-1"
      : count === 2
        ? "grid-cols-1 grid-rows-2 sm:grid-cols-2 sm:grid-rows-1"
        : count <= 4
          ? "grid-cols-2 grid-rows-2"
          : count <= 6
            ? "grid-cols-2 grid-rows-3 sm:grid-cols-3 sm:grid-rows-2"
            : "grid-cols-2 grid-rows-4 sm:grid-cols-4 sm:grid-rows-2";

  return (
    <div className="absolute inset-0 z-[5] flex flex-col gap-1 p-1 sm:p-2">
      {screenTiles[0] ? (
        <div className="min-h-0 flex-[1.4] overflow-hidden rounded-xl border border-white/10">
          <TileVideo tile={screenTiles[0]} />
        </div>
      ) : null}

      <div
        className={`hidden min-h-0 flex-1 md:grid md:gap-1 ${
          screenTiles[0] ? "md:max-h-[38%]" : ""
        } ${gridLayout}`}
      >
        {ordered.map((tile) => (
          <div
            key={tile.identity}
            className={`overflow-hidden rounded-xl border ${
              tile.identity === focusId || tile.isSpeaking
                ? "border-sky-400/50 ring-1 ring-sky-400/30"
                : "border-white/10"
            }`}
          >
            <TileVideo tile={tile} />
          </div>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 md:hidden">
        {useMobileStrip ? (
          <>
            <div className="min-h-0 flex-[1.6] overflow-hidden rounded-xl border border-sky-400/40">
              <TileVideo tile={ordered[0]} />
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {ordered.slice(1).map((tile) => (
                <div
                  key={tile.identity}
                  className="h-24 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10"
                >
                  <TileVideo tile={tile} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className={`grid min-h-0 flex-1 gap-1 ${layoutClass(count)}`}>
            {ordered.map((tile) => (
              <div
                key={tile.identity}
                className="overflow-hidden rounded-xl border border-white/10"
              >
                <TileVideo tile={tile} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute right-3 top-14 rounded-full border border-white/10 bg-black/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/55 backdrop-blur-md sm:right-4">
        {connectionLabel}
      </div>
    </div>
  );
}

const LiveMediaStage = memo(LiveMediaStageComponent);
export default LiveMediaStage;
