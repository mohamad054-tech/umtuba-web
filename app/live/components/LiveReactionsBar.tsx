"use client";

import { memo } from "react";
import { LIVE_REACTIONS, type FloatingLiveReaction } from "../types";
import LiveFloatingReactions from "./LiveFloatingReactions";

type LiveReactionsBarProps = {
  onReact: (emoji: string) => void;
  floatingReactions: FloatingLiveReaction[];
  disabled?: boolean;
  busy?: boolean;
};

function LiveReactionsBarComponent({
  onReact,
  floatingReactions,
  disabled = false,
  busy = false,
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
            disabled={disabled || busy}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg transition hover:scale-110 hover:border-white/25 hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 md:h-10 md:w-10"
            aria-label={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      <LiveFloatingReactions reactions={floatingReactions} variant="bar" />
    </div>
  );
}

const LiveReactionsBar = memo(LiveReactionsBarComponent);
export default LiveReactionsBar;
