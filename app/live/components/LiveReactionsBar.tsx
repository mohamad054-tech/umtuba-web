"use client";

import { LIVE_REACTIONS } from "../data/mockStreams";

type LiveReactionsBarProps = {
  onReact: (emoji: string) => void;
  floatingReactions: { id: string; emoji: string }[];
};

export default function LiveReactionsBar({
  onReact,
  floatingReactions,
}: LiveReactionsBarProps) {
  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
          React
        </span>
        {LIVE_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onReact(emoji)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg transition hover:scale-110 hover:border-white/25 hover:bg-white/10"
            aria-label={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="pointer-events-none absolute -top-16 right-0 flex h-16 w-40 items-end justify-end gap-1 overflow-hidden">
        {floatingReactions.map((reaction) => (
          <span
            key={reaction.id}
            className="animate-[liveFloat_1.1s_ease-out_forwards] text-2xl opacity-90"
          >
            {reaction.emoji}
          </span>
        ))}
      </div>
    </div>
  );
}
