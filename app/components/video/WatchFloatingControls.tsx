"use client";

type WatchFloatingControlsProps = {
  muted: boolean;
  onToggleMute: () => void;
  unmuteLabel: string;
  muteLabel: string;
};

export default function WatchFloatingControls({
  muted,
  onToggleMute,
  unmuteLabel,
  muteLabel,
}: WatchFloatingControlsProps) {
  return (
    <div className="absolute right-4 top-20 z-30 md:top-4">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleMute();
        }}
        className="watch-focus-ring watch-rail-btn flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md hover:bg-black/60"
        aria-label={muted ? unmuteLabel : muteLabel}
        aria-pressed={!muted}
      >
        {muted ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
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
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M11 5L6 9H3v6h3l5 4V5z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M15.5 8.5a4.5 4.5 0 010 7M18.5 6a8 8 0 010 12"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
