import type { OnlineStatus } from "../types";

const STATUS_CLASS: Record<OnlineStatus, string> = {
  online: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]",
  away: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.55)]",
  offline: "bg-white/30",
};

type OnlineStatusDotProps = {
  status: OnlineStatus;
  size?: "sm" | "md";
  className?: string;
};

export default function OnlineStatusDot({
  status,
  size = "sm",
  className = "",
}: OnlineStatusDotProps) {
  const sizeClass = size === "md" ? "h-3 w-3" : "h-2.5 w-2.5";

  return (
    <span
      aria-label={status}
      className={`inline-block rounded-full ring-2 ring-[#0b0b18] ${sizeClass} ${STATUS_CLASS[status]} ${className}`}
    />
  );
}
