"use client";

type MediaProcessingProgressProps = {
  percent: number;
  label?: string;
  detail?: string | null;
};

export default function MediaProcessingProgress({
  percent,
  label = "Processing",
  detail = null,
}: MediaProcessingProgressProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="font-medium text-violet-200/90">{label}</p>
        <p className="tabular-nums text-white/55">{clamped}%</p>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-[width] duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {detail ? <p className="text-xs text-white/45">{detail}</p> : null}
    </div>
  );
}
