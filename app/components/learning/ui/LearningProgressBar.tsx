type LearningProgressBarProps = {
  percent: number;
  label?: string;
  className?: string;
};

export default function LearningProgressBar({
  percent,
  label,
  className = "",
}: LearningProgressBarProps) {
  const value = Number.isFinite(percent)
    ? Math.max(0, Math.min(100, Math.round(percent)))
    : 0;

  return (
    <div className={className}>
      {label ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
          <span className="font-semibold text-white/70">{label}</span>
          <span className="tabular-nums text-white/50">{value}%</span>
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-label={label ?? "Progress"}
        className="h-2 overflow-hidden rounded-full bg-white/10"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-400 transition-[width] duration-500 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
