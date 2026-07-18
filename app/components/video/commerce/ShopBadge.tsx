"use client";

type ShopBadgeProps = {
  count: number;
  disabled?: boolean;
  expanded?: boolean;
  onOpen: () => void;
};

/**
 * Compact shopping affordance. Hidden when count is 0.
 * Does not pause playback or auto-open commerce UI.
 */
export default function ShopBadge({
  count,
  disabled = false,
  expanded = false,
  onOpen,
}: ShopBadgeProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={disabled}
      aria-expanded={expanded}
      aria-haspopup="dialog"
      aria-label={`Shop products in this video, ${count} available`}
      className="pointer-events-auto watch-focus-ring inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-3 py-2 text-sm font-black text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span aria-hidden>🛍</span>
      <span aria-hidden>{count}</span>
    </button>
  );
}
