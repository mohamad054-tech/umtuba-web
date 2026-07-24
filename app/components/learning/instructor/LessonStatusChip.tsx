import type { LearningLessonStatus } from "../../../../lib/learning/lessonsFoundation";

export default function LessonStatusChip({
  status,
}: {
  status: LearningLessonStatus | string;
}) {
  const tone =
    status === "published"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
      : status === "draft"
        ? "border-amber-400/30 bg-amber-500/10 text-amber-100"
        : status === "suspended"
          ? "border-red-400/30 bg-red-500/10 text-red-100"
          : "border-white/15 bg-white/[0.04] text-white/70";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${tone}`}
    >
      {status}
    </span>
  );
}
