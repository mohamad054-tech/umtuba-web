import { learningDs } from "./tokens";

const toneClass: Record<string, string> = {
  neutral: "border-white/15 bg-white/5 text-white/80",
  success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  warning: "border-amber-300/30 bg-amber-400/10 text-amber-50",
  danger: "border-rose-400/30 bg-rose-400/10 text-rose-100",
};

export function LearningStatusBadge({
  children,
  tone = "neutral",
}: {
  children: string;
  tone?: keyof typeof toneClass;
}) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${toneClass[tone] ?? toneClass.neutral}`}>
      {children}
    </span>
  );
}

void learningDs;
