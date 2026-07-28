"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDialogA11y } from "../../lib/product/useDialogA11y";
import { nextIndex, prevIndex } from "../lib/profilePhotosLightbox";
import type { ProfilePost } from "../types";

export type ProfilePhotosLightboxProps = {
  photos: ProfilePost[];
  openIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

/**
 * Full-viewport photo lightbox for Creator Space Photos tab.
 * Reuses useDialogA11y for Escape, focus trap, and focus restore.
 */
export default function ProfilePhotosLightbox({
  photos,
  openIndex,
  onClose,
  onIndexChange,
}: ProfilePhotosLightboxProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const photo = photos[openIndex];
  const count = photos.length;
  const canNavigate = count > 1;
  const open = Boolean(photo);

  useEffect(() => {
    setMounted(true);
  }, []);

  useDialogA11y({
    open: open && mounted,
    onClose,
    containerRef: dialogRef,
    initialFocusRef: closeRef,
  });

  useEffect(() => {
    if (!open || !mounted) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, mounted]);

  useEffect(() => {
    if (!open || !mounted) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        const next = nextIndex(openIndex, count);
        if (next >= 0) {
          onIndexChange(next);
        }
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        const prev = prevIndex(openIndex, count);
        if (prev >= 0) {
          onIndexChange(prev);
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, mounted, openIndex, count, onIndexChange]);

  if (!mounted || !open || !photo) {
    return null;
  }

  const positionLabel = `${openIndex + 1} of ${count}`;
  const caption = photo.content.trim();

  function goNext() {
    const next = nextIndex(openIndex, count);
    if (next >= 0) {
      onIndexChange(next);
    }
  }

  function goPrev() {
    const prev = prevIndex(openIndex, count);
    if (prev >= 0) {
      onIndexChange(prev);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6"
      data-profile-photos-lightbox=""
    >
      <button
        type="button"
        tabIndex={-1}
        className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-[2px] motion-safe:transition-opacity motion-reduce:transition-none"
        aria-label="Close photo lightbox"
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(100dvh-1.5rem,96vh)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#080816]/96 text-white shadow-2xl backdrop-blur-xl motion-safe:animate-[profileTabFade_220ms_ease-out] motion-reduce:animate-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5 sm:px-4">
          <div className="min-w-0">
            <p
              id={titleId}
              className="truncate text-sm font-bold text-white/90"
            >
              Photo {positionLabel}
            </p>
            {caption ? (
              <p className="mt-0.5 truncate text-xs text-white/50">{caption}</p>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="watch-focus-ring flex h-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-lg text-white hover:bg-white/10"
            aria-label="Close photo lightbox"
          >
            ×
          </button>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black/40 px-3 py-3 sm:px-4 sm:py-5">
          <div
            className={`flex max-h-full max-w-full items-center justify-center ${
              canNavigate ? "gap-2.5 sm:gap-3" : ""
            }`}
          >
            {canNavigate ? (
              <button
                type="button"
                onClick={goPrev}
                className="watch-focus-ring flex h-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/50 text-xl text-white transition-colors hover:border-white/30 hover:bg-black/80 motion-reduce:transition-none"
                aria-label="Previous photo"
              >
                ‹
              </button>
            ) : null}

            {photo.imageUrl?.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element -- public post image
              <img
                src={photo.imageUrl}
                alt={caption || `Photo ${openIndex + 1}`}
                className={`h-auto w-auto max-h-[min(85vh,900px)] object-contain ${
                  canNavigate
                    ? "max-w-[min(100%,calc(100vw-11rem))]"
                    : "max-w-full"
                }`}
              />
            ) : (
              <div
                className="flex aspect-square h-auto w-auto max-h-[min(85vh,900px)] max-w-md items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 text-center text-sm font-bold uppercase tracking-wider text-white/40"
                role="img"
                aria-label="Photo placeholder"
              >
                Photo
              </div>
            )}

            {canNavigate ? (
              <button
                type="button"
                onClick={goNext}
                className="watch-focus-ring flex h-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/50 text-xl text-white transition-colors hover:border-white/30 hover:bg-black/80 motion-reduce:transition-none"
                aria-label="Next photo"
              >
                ›
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
