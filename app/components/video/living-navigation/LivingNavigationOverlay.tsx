"use client";

import { useRef } from "react";
import { useDialogA11y } from "../../../lib/product/useDialogA11y";
import LivingNavigationAction from "./LivingNavigationAction";
import LivingNavigationIcon from "./LivingNavigationIcon";
import {
  LIVING_NAVIGATION_ITEMS,
  type LivingNavigationItem,
} from "./livingNavigationConfig";

type LivingNavigationOverlayProps = {
  item: LivingNavigationItem;
  onSelect: (item: LivingNavigationItem) => void;
  onClose: () => void;
};

export default function LivingNavigationOverlay({
  item,
  onSelect,
  onClose,
}: LivingNavigationOverlayProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useDialogA11y({
    open: true,
    onClose,
    containerRef: dialogRef,
    initialFocusRef: closeRef,
  });

  return (
    <div
      className="absolute inset-0 z-[90] flex items-end justify-end sm:items-stretch"
      data-living-navigation-overlay={item.id}
    >
      <button
        type="button"
        tabIndex={-1}
        className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-[2px]"
        aria-label="Close Living Navigation overlay"
        onClick={onClose}
      />

      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="living-navigation-title"
        aria-describedby="living-navigation-description"
        className="watch-panel-enter relative z-10 flex max-h-[76%] w-full flex-col rounded-t-[28px] border border-white/10 bg-[#080816]/96 p-5 text-white shadow-2xl backdrop-blur-xl sm:h-full sm:max-h-none sm:max-w-[min(100%,24rem)] sm:rounded-none sm:rounded-l-[28px] sm:p-6"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 sm:hidden" />

        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white">
              <LivingNavigationIcon icon={item.icon} className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-200/70">
                Living Navigation prototype
              </p>
              <h2
                id="living-navigation-title"
                className="mt-1 truncate text-xl font-black sm:text-2xl"
              >
                {item.overlayTitle}
              </h2>
            </div>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="watch-focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white hover:bg-white/10"
            aria-label={`Close ${item.label} prototype`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <p
          id="living-navigation-description"
          className="mt-5 text-sm leading-7 text-white/70"
        >
          {item.placeholderDescription}
        </p>

        <div className="mt-5 rounded-3xl border border-dashed border-white/15 bg-white/[0.04] p-5">
          <p className="text-sm font-black text-white/90">Prototype only</p>
          <p className="mt-2 text-sm leading-6 text-white/55">
            This preview validates navigation above a living video. Product
            content, data, and actions will arrive in a future sprint.
          </p>
        </div>

        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
            Switch preview
          </p>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Switch Living Navigation prototype"
          >
            {LIVING_NAVIGATION_ITEMS.map((candidate) => (
              <LivingNavigationAction
                key={candidate.id}
                item={candidate}
                active={candidate.id === item.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>

        <p className="mt-auto pt-6 text-xs leading-5 text-white/40">
          The Watch video remains mounted behind this overlay. Closing returns
          to the same feed position and playback state.
        </p>
      </aside>
    </div>
  );
}
