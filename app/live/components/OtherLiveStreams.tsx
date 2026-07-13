import type { LiveRoom } from "../types";
import LiveStreamCard from "./LiveStreamCard";

type OtherLiveStreamsProps = {
  rooms: LiveRoom[];
  activeId: string;
  onSelect: (id: string) => void;
};

export default function OtherLiveStreams({
  rooms,
  activeId,
  onSelect,
}: OtherLiveStreamsProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl md:rounded-[32px] md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-red-300">
            Live now
          </p>
          <h3 className="mt-1 text-xl font-black text-white md:text-2xl">
            Other active live rooms
          </h3>
          <p className="mt-1 text-sm text-white/45">
            Jump between cities lighting up the UMTUBA globe.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-200">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          {rooms.length} live
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rooms.map((room) => (
          <LiveStreamCard
            key={room.id}
            room={room}
            isActive={room.id === activeId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
