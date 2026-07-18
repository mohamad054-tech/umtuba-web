"use client";

type MediaUploadProgressProps = {
  percent: number;
  label?: string;
  indeterminate?: boolean;
};

export default function MediaUploadProgress({
  percent,
  label = "Uploading",
  indeterminate = false,
}: MediaUploadProgressProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="font-medium text-sky-200/90">{label}</p>
        <p className="tabular-nums text-white/55">
          {indeterminate ? "…" : `${clamped}%`}
        </p>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : clamped}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-400 transition-[width] duration-200 ${
            indeterminate ? "w-1/3 animate-pulse" : ""
          }`}
          style={indeterminate ? undefined : { width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
