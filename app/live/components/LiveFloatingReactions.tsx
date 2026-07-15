"use client";

import { memo } from "react";
import type { FloatingLiveReaction } from "../types";

type LiveFloatingReactionsProps = {
  reactions: FloatingLiveReaction[];
  /** Compact bar-adjacent float vs full stage overlay */
  variant?: "stage" | "bar";
};

function LiveFloatingReactionsComponent({
  reactions,
  variant = "stage",
}: LiveFloatingReactionsProps) {
  if (reactions.length === 0) {
    return null;
  }

  if (variant === "bar") {
    return (
      <div
        className="pointer-events-none absolute -top-20 right-0 flex h-20 w-48 items-end justify-end overflow-visible"
        aria-hidden
      >
        {reactions.map((reaction) => (
          <span
            key={reaction.id}
            className="absolute bottom-0 animate-[liveFloat_1.6s_ease-out_forwards] text-2xl will-change-transform"
            style={{
              right: `${8 + (reaction.drift ?? 0.5) * 120}px`,
              animationDelay: "0ms",
            }}
          >
            {reaction.emoji}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-16 top-12 z-20 overflow-hidden"
      aria-hidden
    >
      {reactions.map((reaction) => {
        const left = 12 + (reaction.drift ?? 0.5) * 76;
        return (
          <span
            key={reaction.id}
            className="absolute bottom-0 animate-[liveFloatStage_1.6s_cubic-bezier(0.22,1,0.36,1)_forwards] text-3xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)] will-change-transform md:text-4xl"
            style={{ left: `${left}%` }}
          >
            {reaction.emoji}
          </span>
        );
      })}
    </div>
  );
}

const LiveFloatingReactions = memo(LiveFloatingReactionsComponent);
export default LiveFloatingReactions;
