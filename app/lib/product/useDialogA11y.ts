"use client";

import { useEffect, useRef, type RefObject } from "react";

type UseDialogA11yOptions = {
  open: boolean;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  containerRef: RefObject<HTMLElement | null>;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Lightweight dialog a11y: Escape, initial focus, restore focus, simple Tab cycle.
 */
export function useDialogA11y({
  open,
  onClose,
  initialFocusRef,
  containerRef,
}: UseDialogA11yOptions) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusTarget =
      initialFocusRef?.current ??
      containerRef.current?.querySelector<HTMLElement>(FOCUSABLE) ??
      null;
    focusTarget?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !containerRef.current) {
        return;
      }

      const nodes = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);

      if (nodes.length === 0) {
        return;
      }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open, onClose, initialFocusRef, containerRef]);
}
