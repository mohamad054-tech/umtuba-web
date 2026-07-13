import type { LiveStream } from "../data/mockStreams";
import LiveBadge from "./LiveBadge";

type LiveStreamMetaProps = {
  stream: LiveStream;
};

export default function LiveStreamMeta({ stream }: LiveStreamMetaProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <LiveBadge size="sm" />
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200/80">
          {stream.category}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
          {stream.city}, {stream.country}
        </span>
      </div>

      <h2 className="text-xl font-black leading-snug tracking-tight text-white md:text-2xl">
        {stream.title}
      </h2>
    </div>
  );
}
