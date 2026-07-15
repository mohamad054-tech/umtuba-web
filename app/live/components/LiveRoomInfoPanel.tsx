import type { LiveRoom } from "../types";
import LiveBadge from "./LiveBadge";

type LiveRoomInfoPanelProps = {
  room: LiveRoom;
};

export default function LiveRoomInfoPanel({ room }: LiveRoomInfoPanelProps) {
  const visibilityLabel =
    room.visibility === "public"
      ? "Public"
      : room.visibility === "private"
        ? "Private"
        : "Group";

  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
        Room info
      </p>
      <h3 className="mt-0.5 text-sm font-black text-white">Details</h3>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {room.status === "live" ? <LiveBadge size="sm" /> : null}
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
          {visibilityLabel}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200/80">
          {room.category || "Live"}
        </span>
      </div>

      <dl className="mt-3 space-y-2 text-xs text-white/55">
        <div className="flex justify-between gap-3">
          <dt className="text-white/35">Host</dt>
          <dd className="truncate font-bold text-white/80">{room.host.name}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-white/35">Location</dt>
          <dd className="truncate font-bold text-white/80">
            {[room.city, room.country].filter(Boolean).join(", ") || "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-white/35">Started</dt>
          <dd className="font-bold text-white/80">{room.startedAtLabel}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-white/35">Viewers</dt>
          <dd className="font-bold tabular-nums text-white/80">
            {room.viewerCount}
          </dd>
        </div>
        {room.description ? (
          <div>
            <dt className="text-white/35">About</dt>
            <dd className="mt-1 text-white/70">{room.description}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
