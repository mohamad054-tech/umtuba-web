"use client";

import type { MouseEvent } from "react";

type TapToUnmuteOverlayProps = {
  visible: boolean;
  label: string;
  onUnmute: () => void;
};

export default function TapToUnmuteOverlay({
  visible,
  label,
  onUnmute,
}: TapToUnmuteOverlayProps) {
  if (!visible) {
    return null;
  }

  function handleUnmute(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    onUnmute();
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center px-6">
      <button
        type="button"
        onClick={handleUnmute}
        className="pointer-events-auto watch-focus-ring flex min-h-16 min-w-[220px] items-center justify-center gap-3 rounded-full border border-white/25 bg-black/70 px-8 py-4 text-base font-bold text-white shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md hover:bg-black/80"
        aria-label={label}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M11 5L6 9H3v6h3l5 4V5z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M16 9.5l5 5M21 9.5l-5 5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        <span>{label}</span>
      </button>
    </div>
  );
}
