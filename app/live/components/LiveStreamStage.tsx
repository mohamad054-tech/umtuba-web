import type { RefObject } from "react";
import LiveBadge from "./LiveBadge";
import LiveViewerCount from "./LiveViewerCount";
import type { LiveRoom } from "../types";

type LiveStreamStageProps = {
  room: LiveRoom;
  muted: boolean;
  captionsOn: boolean;
  quality: string;
  isFullscreen: boolean;
  stageRef: RefObject<HTMLDivElement | null>;
};

export default function LiveStreamStage({
  room,
  muted,
  captionsOn,
  quality,
  isFullscreen,
  stageRef,
}: LiveStreamStageProps) {
  return (
    <div
      ref={stageRef}
      className={`relative overflow-hidden border border-white/10 bg-[#080816]/80 shadow-[0_0_60px_rgba(37,99,235,0.12)] backdrop-blur-xl ${
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none border-0"
          : "aspect-video w-full rounded-[28px] md:rounded-[32px]"
      }`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${room.previewGradient}`}
      />

      <div className="pointer-events-none absolute inset-0">
        <div
          className={`absolute -left-16 top-1/4 h-56 w-56 rounded-full blur-3xl ${room.previewAccent}`}
        />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(5,5,16,0.55)_100%)]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2 md:left-5 md:top-5">
        <LiveBadge size="md" />
        <LiveViewerCount count={room.viewerCount} />
        <span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55 backdrop-blur-md">
          {quality}
        </span>
        {room.status === "live" ? (
          <span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45 backdrop-blur-md">
            Stage ready
          </span>
        ) : (
          <span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45 backdrop-blur-md">
            {room.status}
          </span>
        )}
      </div>

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/10 shadow-[0_0_40px_rgba(239,68,68,0.35)] backdrop-blur-md md:h-20 md:w-20">
          <span className="ml-1 text-2xl text-white md:text-3xl" aria-hidden>
            ▶
          </span>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-red-300/90">
          UMTUBA Live Stage
        </p>
        <h2 className="mt-3 max-w-xl text-2xl font-black tracking-tight text-white md:text-4xl">
          {room.previewLabel}
        </h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-white/55 md:text-base">
          Media plane reserved for WebRTC / SFU ingest — rooms, chat, and host
          controls are live in V1.
        </p>
      </div>

      {muted ? (
        <div className="absolute bottom-4 left-4 z-10 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-xs font-bold text-white/70 backdrop-blur-md md:bottom-5 md:left-5">
          Muted
        </div>
      ) : null}

      {captionsOn ? (
        <div className="absolute bottom-6 left-1/2 z-10 w-[min(90%,36rem)] -translate-x-1/2 rounded-2xl border border-white/10 bg-black/65 px-4 py-3 text-center text-sm font-medium leading-6 text-white/90 backdrop-blur-md">
          [CC] Welcome to {room.city} — you&apos;re watching a live moment from
          the UMTUBA globe.
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/70 to-transparent" />
    </div>
  );
}
