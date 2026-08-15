import { learningDs } from "./tokens";

export function LearningProgressBar({
  percent,
  label,
}: {
  percent: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="space-y-2">
      {label ? <p className={learningDs.label}>{label}</p> : null}
      <div
        className="h-2 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label={label ?? "Progress"}
      >
        <div
          className="h-full rounded-full bg-cyan-300/80 transition-[width] duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className={`text-xs ${learningDs.muted}`} aria-live="polite">
        {clamped}% complete
      </p>
    </div>
  );
}
