import { formatViewerCount } from "../types";

type LiveViewerCountProps = {
  count: number;
  className?: string;
};

export default function LiveViewerCount({
  count,
  className = "",
}: LiveViewerCountProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-xs font-bold text-white/85 backdrop-blur-md ${className}`}
    >
      <span aria-hidden className="text-[11px] text-red-300">
        ●
      </span>
      <span className="tabular-nums">{formatViewerCount(count)}</span>
      <span className="font-medium text-white/45">watching</span>
    </span>
  );
}
