"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FloatingLiveReaction } from "../types";

const MAX_FLOATING = 14;
const REACTION_TTL_MS = 1600;

export function useFloatingReactions() {
  const [floatingReactions, setFloatingReactions] = useState<
    FloatingLiveReaction[]
  >([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const clearTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer != null) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const pushReaction = useCallback(
    (emoji: string, id?: string) => {
      const reactionId =
        id ??
        `rx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const drift = Math.random();

      setFloatingReactions((prev) => {
        if (prev.some((r) => r.id === reactionId)) {
          return prev;
        }
        return [
          ...prev.slice(-(MAX_FLOATING - 1)),
          { id: reactionId, emoji, drift },
        ];
      });

      clearTimer(reactionId);
      const timer = window.setTimeout(() => {
        setFloatingReactions((prev) =>
          prev.filter((item) => item.id !== reactionId)
        );
        timersRef.current.delete(reactionId);
      }, REACTION_TTL_MS);
      timersRef.current.set(reactionId, timer);
    },
    [clearTimer]
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) {
        window.clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  return { floatingReactions, pushReaction };
}
