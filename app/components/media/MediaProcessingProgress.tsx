"use client";

type MediaProcessingProgressProps = {
  /** Omit or null with indeterminate for honest in-progress publishing. */
  percent?: number | null;
  label?: string;
  detail?: string | null;
  /** When true, show activity without inventing a percent. */
  indeterminate?: boolean;
};

export default function MediaProcessingProgress({
  percent = null,
  label = "Processing",
  detail = null,
  indeterminate = false,
}: MediaProcessingProgressProps) {
  const showIndeterminate =
    indeterminate || percent == null || !Number.isFinite(percent);
  const clamped = showIndeterminate
    ? 0
    : Math.max(0, Math.min(100, Math.round(percent as number)));

  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="font-medium text-violet-200/90">{label}</p>
        <p className="tabular-nums text-white/55">
          {showIndeterminate ? "In progress" : `${clamped}%`}
        </p>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={showIndeterminate ? undefined : clamped}
        aria-valuetext={showIndeterminate ? "In progress" : undefined}
        aria-label={label}
      >
        {showIndeterminate ? (
          <div className="h-full w-1/3 animate-pulse rounded-full bg-gradient-to-r from-violet-500/80 to-fuchsia-400/80" />
        ) : (
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-[width] duration-300"
            style={{ width: `${clamped}%` }}
          />
        )}
      </div>
      {detail ? <p className="text-xs text-white/45">{detail}</p> : null}
    </div>
  );
}
