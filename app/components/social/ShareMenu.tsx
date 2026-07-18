"use client";

import { useId, useRef, type ReactNode } from "react";
import {
  canUseNativeShare,
  type ShareTarget,
} from "../../lib/social/shareAndViews";
import { useDialogA11y } from "../../lib/product/useDialogA11y";

type ShareMenuProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (target: ShareTarget) => void;
  disabled?: boolean;
  align?: "left" | "right" | "center";
};

export default function ShareMenu({
  open,
  onClose,
  onSelect,
  disabled = false,
  align = "right",
}: ShareMenuProps) {
  const titleId = useId();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const firstButtonRef = useRef<HTMLButtonElement | null>(null);
  const nativeAvailable = canUseNativeShare();

  useDialogA11y({
    open,
    onClose,
    containerRef: menuRef,
    initialFocusRef: firstButtonRef,
  });

  if (!open) {
    return null;
  }

  const alignClass =
    align === "left"
      ? "left-0"
      : align === "center"
        ? "left-1/2 -translate-x-1/2"
        : "right-0";

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default bg-transparent"
        aria-label="Close share menu"
        onClick={onClose}
      />

      <div
        ref={menuRef}
        role="menu"
        aria-labelledby={titleId}
        className={`absolute bottom-[calc(100%+0.75rem)] z-50 w-52 overflow-hidden rounded-2xl border border-white/15 bg-[#0b0b18]/96 p-1.5 shadow-2xl backdrop-blur-xl ${alignClass}`}
      >
        <p
          id={titleId}
          className="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/45"
        >
          Share to
        </p>

        <button
          ref={firstButtonRef}
          type="button"
          role="menuitem"
          disabled={disabled}
          onClick={() => onSelect("whatsapp")}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-white transition hover:bg-white/10 disabled:opacity-45"
        >
          <MenuIcon tone="whatsapp">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12.04 2c-5.5 0-9.96 4.45-9.96 9.93 0 1.75.46 3.45 1.34 4.95L2 22l5.27-1.38a10 10 0 004.77 1.21h.01c5.5 0 9.96-4.45 9.96-9.93S17.54 2 12.04 2zm5.8 14.24c-.24.68-1.42 1.25-1.96 1.33-.5.07-1.14.1-1.84-.12-.42-.13-.97-.28-1.67-.55-2.94-1.27-4.86-4.23-5.01-4.43-.15-.2-1.22-1.62-1.22-3.09 0-1.47.77-2.19 1.04-2.49.27-.3.59-.37.79-.37h.57c.18 0 .42-.07.66.5.24.58.82 2 .89 2.15.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.17-.31.39-.44.52-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.03 1.12 1 2.07 1.31 2.36 1.46.3.15.47.12.64-.07.18-.2.75-.87.95-1.17.2-.3.4-.25.66-.15.27.1 1.7.8 1.99.95.3.15.49.22.56.34.08.13.08.74-.16 1.42z" />
            </svg>
          </MenuIcon>
          <MenuCopy label="WhatsApp" description="Open WhatsApp Web" />
        </button>

        <button
          type="button"
          role="menuitem"
          disabled={disabled}
          onClick={() => onSelect("clipboard")}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-white transition hover:bg-white/10 disabled:opacity-45"
        >
          <MenuIcon>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M9 9V6.5A2.5 2.5 0 0111.5 4h6A2.5 2.5 0 0120 6.5v6a2.5 2.5 0 01-2.5 2.5H15M6.5 9H13A2.5 2.5 0 0115.5 11.5v6A2.5 2.5 0 0113 20H6.5A2.5 2.5 0 014 17.5v-6A2.5 2.5 0 016.5 9z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
          </MenuIcon>
          <MenuCopy label="Copy link" description="Copy post URL" />
        </button>

        {nativeAvailable ? (
          <button
            type="button"
            role="menuitem"
            disabled={disabled}
            onClick={() => onSelect("native")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-white transition hover:bg-white/10 disabled:opacity-45"
          >
            <MenuIcon>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M14 6l6 6-6 6M20 12H9M10 6H7.5A2.5 2.5 0 005 8.5v7A2.5 2.5 0 007.5 18H10"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </MenuIcon>
            <MenuCopy label="More…" description="System share" />
          </button>
        ) : null}
      </div>
    </>
  );
}

function MenuIcon({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "whatsapp";
}) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 ${
        tone === "whatsapp" ? "text-emerald-300" : "text-white/85"
      }`}
    >
      {children}
    </span>
  );
}

function MenuCopy({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <span className="min-w-0">
      <span className="block text-sm font-bold">{label}</span>
      <span className="block text-[11px] text-white/45">{description}</span>
    </span>
  );
}
