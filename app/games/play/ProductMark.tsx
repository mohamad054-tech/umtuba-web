"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../components/i18n";

export type ProductKind = "bag" | "phone" | "cup" | "book" | "shoe" | "lamp" | "watch" | "plant";

export default function ProductMark({ kind }: { kind: string }) {
  return (
    <svg className="um-product-mark" viewBox="0 0 72 72" aria-hidden="true">
      <rect width="72" height="72" rx="12" fill="#12182f" />
      {kind === "bag" ? (
        <>
          <path d="M24 28 H48 L52 58 H20 Z" fill="#c4a574" />
          <path d="M28 28 C28 18 44 18 44 28" fill="none" stroke="#f0a93b" strokeWidth="3" />
        </>
      ) : null}
      {kind === "phone" ? (
        <>
          <rect x="22" y="12" width="28" height="48" rx="6" fill="#7ed9b8" />
          <circle cx="36" cy="52" r="2" fill="#12182f" />
        </>
      ) : null}
      {kind === "cup" ? (
        <>
          <path d="M20 22 H46 L42 54 H24 Z" fill="#d7ece4" />
          <path d="M46 28 H54 A8 8 0 0 1 46 42" fill="none" stroke="#f0a93b" strokeWidth="3" />
        </>
      ) : null}
      {kind === "book" ? (
        <>
          <path d="M16 16 H38 L52 24 V56 H16 Z" fill="#e7d7a1" />
          <path d="M38 16 V24 H52" fill="none" stroke="#9a6e22" strokeWidth="2" />
        </>
      ) : null}
      {kind === "shoe" ? (
        <path d="M14 40 H34 L40 32 H58 L62 46 H14 Z" fill="#d46a5e" />
      ) : null}
      {kind === "lamp" ? (
        <>
          <path d="M24 18 H48 L42 36 H30 Z" fill="#f0a93b" />
          <rect x="34" y="36" width="4" height="16" fill="#eef1fb" />
          <rect x="26" y="52" width="20" height="4" fill="#eef1fb" />
        </>
      ) : null}
      {kind === "watch" ? (
        <>
          <rect x="30" y="10" width="12" height="10" rx="2" fill="#9aa4c7" />
          <circle cx="36" cy="38" r="16" fill="#eef1fb" />
          <circle cx="36" cy="38" r="12" fill="none" stroke="#1c2748" strokeWidth="2" />
          <path d="M36 38 L36 30 L42 40" fill="none" stroke="#1c2748" strokeWidth="2" />
          <rect x="30" y="52" width="12" height="10" rx="2" fill="#9aa4c7" />
        </>
      ) : null}
      {kind === "plant" ? (
        <>
          <path d="M28 58 H44 L40 40 H32 Z" fill="#c4a574" />
          <circle cx="28" cy="32" r="10" fill="#2f8f62" />
          <circle cx="42" cy="28" r="12" fill="#3cbf78" />
          <circle cx="36" cy="20" r="8" fill="#7ed9b8" />
        </>
      ) : null}
    </svg>
  );
}

export function ShopPicture({ kind, hero }: { kind: string; hero?: boolean }) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const openLabel = locale === "ar" ? "افتح الصورة" : "Open the picture";
  const closeLabel = locale === "ar" ? "أغلق الصورة" : "Close the picture";
  return (
    <>
      <button
        type="button"
        className={hero ? "um-shop-hero" : "um-shop-mark"}
        aria-label={openLabel}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <ProductMark kind={kind} />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <PictureZoom kind={kind} label={closeLabel} onClose={() => setOpen(false)} />,
            document.body,
          )
        : null}
    </>
  );
}

function PictureZoom({ kind, label, onClose }: { kind: string; label: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const moved = useRef(false);
  const born = useRef(Date.now());

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const zoomTo = (next: number) => {
    const clamped = Math.min(4, Math.max(1, next));
    scaleRef.current = clamped;
    setScale(clamped);
  };

  return (
    <div
      className="um-sight-zoom"
      role="dialog"
      aria-label={label}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        moved.current = false;
        if (pointers.current.size === 2) {
          const pts = [...pointers.current.values()];
          pinchRef.current = {
            dist: Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y) || 1,
            scale: scaleRef.current,
          };
        }
      }}
      onPointerMove={(event) => {
        const prev = pointers.current.get(event.pointerId);
        if (!prev) return;
        if (Math.hypot(event.clientX - prev.x, event.clientY - prev.y) > 10) moved.current = true;
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.current.size < 2 || !pinchRef.current) return;
        const pts = [...pointers.current.values()];
        const dist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y) || 1;
        zoomTo(pinchRef.current.scale * (dist / pinchRef.current.dist));
      }}
      onPointerUp={(event) => {
        pointers.current.delete(event.pointerId);
        if (pointers.current.size < 2) pinchRef.current = null;
        if (Date.now() - born.current < 350) return;
        if (pointers.current.size === 0 && !moved.current) onClose();
      }}
      onPointerCancel={() => {
        pointers.current.clear();
        pinchRef.current = null;
      }}
    >
      <span className="um-shop-zoom-art" style={{ transform: `scale(${scale})` }}>
        <ProductMark kind={kind} />
      </span>
    </div>
  );
}
