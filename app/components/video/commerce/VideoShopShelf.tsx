"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { formatMinorUnits } from "../../../../lib/store/money";
import type { VideoShopShelfItem } from "../../../../lib/store/videoCommerce";
import { useDialogA11y } from "../../../lib/product/useDialogA11y";
import { recordVideoCommerceEventAction } from "../../../actions/videoCommerce";

type VideoShopShelfProps = {
  open: boolean;
  postId: number;
  items: VideoShopShelfItem[];
  onClose: () => void;
};

/**
 * Bottom sheet for linked products. Never pauses Watch playback.
 * Close via swipe down, outside tap, Escape, or parent (next video).
 */
export default function VideoShopShelf({
  open,
  postId,
  items,
  onClose,
}: VideoShopShelfProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dragStartYRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const viewedRef = useRef<Set<string>>(new Set());

  useDialogA11y({
    open,
    onClose,
    initialFocusRef: closeRef,
    containerRef: panelRef,
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open) {
      viewedRef.current.clear();
      dragOffsetRef.current = 0;
      setDragOffset(0);
      return;
    }

    for (const item of items) {
      if (viewedRef.current.has(item.productId)) {
        continue;
      }
      viewedRef.current.add(item.productId);
      void recordVideoCommerceEventAction({
        eventType: "product_viewed",
        postId,
        productId: item.productId,
        clientEventId: `pv-${postId}-${item.productId}-${Date.now()}`,
      });
    }
  }, [open, items, postId]);

  if (!open) {
    return null;
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (reduceMotion) {
      return;
    }
    dragStartYRef.current = event.clientY;
    dragOffsetRef.current = 0;
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (dragStartYRef.current == null) {
      return;
    }
    const delta = Math.max(0, event.clientY - dragStartYRef.current);
    dragOffsetRef.current = delta;
    setDragOffset(delta);
  }

  function handlePointerUp() {
    const shouldClose = dragOffsetRef.current > 80;
    dragStartYRef.current = null;
    dragOffsetRef.current = 0;
    setDragOffset(0);
    if (shouldClose) {
      onClose();
    }
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close shop shelf"
        className="absolute inset-0 bg-black/35"
        onClick={onClose}
      />

      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[70%] overflow-hidden rounded-t-[28px] border border-white/10 bg-[#080816]/95 shadow-[0_-20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl md:inset-x-auto md:mx-3 md:mb-3 md:rounded-[28px]"
        style={
          reduceMotion
            ? undefined
            : {
                transform: dragOffset ? `translateY(${dragOffset}px)` : undefined,
                transition:
                  dragStartYRef.current == null
                    ? "transform 180ms ease"
                    : undefined,
              }
        }
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">
              Shop
            </p>
            <h2
              id={titleId}
              className="truncate text-base font-black text-white"
            >
              Products in this moment
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="watch-focus-ring shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div
          className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/25"
          aria-hidden
        />

        <ul className="max-h-[min(52vh,420px)] space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
          {items.length === 0 ? (
            <li className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-white/60">
              No products in this moment.
            </li>
          ) : (
            items.map((item) => {
              const price =
                item.priceMinor != null && item.currency
                  ? formatMinorUnits(item.priceMinor, item.currency)
                  : "Price TBD";

              return (
                <li
                  key={item.attachmentId}
                  className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                >
                  <div
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-white/10 to-white/5"
                    aria-hidden
                  >
                    {item.coverPath ? (
                      <span className="absolute inset-x-0 bottom-1 truncate px-1 text-center text-[9px] font-bold uppercase tracking-wider text-white/50">
                        {item.coverPath.split("/").pop()}
                      </span>
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/40">
                        No image
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                      {item.storeName}
                    </p>
                    <p className="truncate text-sm font-black text-white">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm font-bold text-white/90">{price}</p>
                    <p
                      className="mt-0.5 text-xs text-white/45"
                      aria-label={`Rating: ${item.ratingLabel}`}
                    >
                      {item.ratingLabel}
                    </p>
                    <Link
                      href={item.href}
                      aria-label={`View product ${item.title}`}
                      className="watch-focus-ring mt-2 inline-flex min-h-11 items-center rounded-full bg-white px-4 py-2 text-xs font-black text-black hover:bg-white/90"
                    >
                      View Product
                    </Link>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </section>
    </div>
  );
}
