"use client";

import { useEffect, useRef } from "react";
import { snakeDirFromDelta, type Dir4 } from "../../../lib/games/play/engine";

export const BOARD_SWIPE_PX = 10;

type BoardHandlers = {
  onSwipe?: (direction: Dir4) => void;
  /** When false, one finger stroke can queue more than one swipe. */
  swipeOnce?: boolean;
};

/**
 * Mouse and finger input on a game board. Touch on the board does not scroll,
 * zoom, or pull the page.
 */
export function useBoardPointer(
  ref: { current: HTMLElement | null },
  handlers: BoardHandlers,
  active: boolean
) {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const element = ref.current;
    if (!element || !active) return;
    let start: { x: number; y: number } | null = null;
    let swiped = false;

    const blockMove = (event: Event) => {
      event.preventDefault();
    };

    const onDown = (event: PointerEvent) => {
      if (!event.isPrimary) return;
      start = { x: event.clientX, y: event.clientY };
      swiped = false;
      try {
        element.setPointerCapture(event.pointerId);
      } catch {
        /* pointer already gone */
      }
    };

    const onMove = (event: PointerEvent) => {
      if (!start || !event.isPrimary) return;
      event.preventDefault();
      if (swiped && handlersRef.current.swipeOnce !== false) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.hypot(dx, dy) < BOARD_SWIPE_PX) return;
      const next = snakeDirFromDelta(dx, dy);
      if (!next) return;
      swiped = true;
      handlersRef.current.onSwipe?.(next);
      start = { x: event.clientX, y: event.clientY };
    };

    const onUp = (event: PointerEvent) => {
      if (!start) return;
      const origin = start;
      const didSwipe = swiped;
      start = null;
      swiped = false;
      if (didSwipe) return;
      const dx = event.clientX - origin.x;
      const dy = event.clientY - origin.y;
      if (Math.hypot(dx, dy) < BOARD_SWIPE_PX) return;
      const next = snakeDirFromDelta(dx, dy);
      if (next) handlersRef.current.onSwipe?.(next);
    };

    const onCancel = () => {
      start = null;
      swiped = false;
    };

    element.addEventListener("pointerdown", onDown);
    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerup", onUp);
    element.addEventListener("pointercancel", onCancel);
    element.addEventListener("touchmove", blockMove, { passive: false });
    return () => {
      element.removeEventListener("pointerdown", onDown);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerup", onUp);
      element.removeEventListener("pointercancel", onCancel);
      element.removeEventListener("touchmove", blockMove);
    };
  }, [active, ref]);
}
