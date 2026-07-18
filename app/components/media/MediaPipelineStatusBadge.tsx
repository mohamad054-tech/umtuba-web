import {
  mediaStatusLabel,
  type MediaPipelineStatus,
} from "../../../lib/media/pipelineTypes";

type MediaPipelineStatusBadgeProps = {
  status: MediaPipelineStatus;
  className?: string;
};

const STATUS_STYLES: Record<MediaPipelineStatus, string> = {
  draft: "border-white/15 bg-white/5 text-white/60",
  uploading: "border-sky-400/30 bg-sky-500/15 text-sky-100",
  queued: "border-amber-400/30 bg-amber-500/15 text-amber-100",
  processing: "border-violet-400/30 bg-violet-500/15 text-violet-100",
  ready: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100",
  failed: "border-red-400/30 bg-red-500/15 text-red-100",
};

export default function MediaPipelineStatusBadge({
  status,
  className = "",
}: MediaPipelineStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[status]} ${className}`}
    >
      {mediaStatusLabel(status)}
    </span>
  );
}
