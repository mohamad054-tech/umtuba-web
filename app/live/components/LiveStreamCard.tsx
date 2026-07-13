import LiveBadge from "./LiveBadge";
import { formatViewerCount, type LiveStream } from "../data/mockStreams";

type LiveStreamCardProps = {
  stream: LiveStream;
  isActive?: boolean;
  onSelect: (id: string) => void;
};

export default function LiveStreamCard({
  stream,
  isActive = false,
  onSelect,
}: LiveStreamCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(stream.id)}
      className={`group w-full overflow-hidden rounded-[24px] border text-left transition ${
        isActive
          ? "border-red-400/40 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.15)]"
          : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]"
      }`}
    >
      <div
        className={`relative aspect-[16/10] overflow-hidden bg-gradient-to-br ${stream.previewGradient}`}
      >
        <div
          className={`absolute -right-6 top-4 h-24 w-24 rounded-full blur-2xl ${stream.previewAccent}`}
        />
        <div className="absolute left-3 top-3">
          <LiveBadge size="sm" />
        </div>
        <div className="absolute bottom-3 right-3 rounded-full border border-white/10 bg-black/50 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white/80 backdrop-blur-md">
          {formatViewerCount(stream.viewerCount)}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/35 text-sm text-white opacity-80 transition group-hover:scale-110 group-hover:opacity-100">
            ▶
          </span>
        </div>
      </div>

      <div className="space-y-2 p-3.5">
        <p className="line-clamp-2 text-sm font-black leading-snug text-white">
          {stream.title}
        </p>
        <div className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br text-[9px] font-black text-white ${stream.creator.avatarGradient}`}
          >
            {stream.creator.initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-white/75">
              {stream.creator.name}
            </p>
            <p className="truncate text-[10px] text-white/40">
              {stream.city}, {stream.country} · {stream.category}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}
