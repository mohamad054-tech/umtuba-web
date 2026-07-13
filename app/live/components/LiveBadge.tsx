type LiveBadgeProps = {
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
  className?: string;
};

const SIZE_CLASS = {
  sm: "gap-1.5 px-2 py-0.5 text-[10px]",
  md: "gap-2 px-2.5 py-1 text-[11px]",
  lg: "gap-2 px-3 py-1.5 text-xs",
} as const;

const DOT_SIZE = {
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
  lg: "h-2.5 w-2.5",
} as const;

export default function LiveBadge({
  size = "md",
  pulse = true,
  className = "",
}: LiveBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-red-400/35 bg-red-500/15 font-black uppercase tracking-[0.22em] text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.25)] backdrop-blur-md ${SIZE_CLASS[size]} ${className}`}
    >
      <span className="relative flex items-center justify-center">
        {pulse ? (
          <span className={`absolute inline-flex animate-ping rounded-full bg-red-400 opacity-60 ${DOT_SIZE[size]}`} />
        ) : null}
        <span
          className={`relative inline-block rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.85)] ${DOT_SIZE[size]}`}
        />
      </span>
      Live
    </span>
  );
}
