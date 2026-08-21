"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  applyDocumentLocale,
  compactLocaleLabel,
  listSupportedLocales,
  type AppLocale,
} from "../../../lib/i18n";
import { useTranslation } from "./I18nProvider";

type LanguageSelectorProps = {
  id?: string;
  className?: string;
  /** Visual tone for Settings (dark) vs light surfaces. */
  tone?: "light" | "dark";
  /** `full` = settings block; `compact` = chrome/auth control (label sr-only). */
  variant?: "full" | "compact";
  /**
   * Optional controlled change handler. When omitted, persists cookie and refreshes.
   */
  onLocaleChange?: (locale: AppLocale) => void;
};

type MenuBox = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const MENU_MIN_WIDTH = 288;
const MENU_MAX_HEIGHT = 360;
const VIEWPORT_PAD = 8;

function placeLocaleMenu(anchor: DOMRect): MenuBox {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(Math.max(anchor.width, MENU_MIN_WIDTH), vw - VIEWPORT_PAD * 2);
  let left = anchor.left;
  if (left + width > vw - VIEWPORT_PAD) {
    left = Math.max(VIEWPORT_PAD, anchor.right - width);
  }
  if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;

  const spaceBelow = vh - anchor.bottom - VIEWPORT_PAD - 8;
  const spaceAbove = anchor.top - VIEWPORT_PAD - 8;
  const openAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
  const maxHeight = Math.min(
    MENU_MAX_HEIGHT,
    Math.max(160, openAbove ? spaceAbove : spaceBelow)
  );
  const top = openAbove
    ? Math.max(VIEWPORT_PAD, anchor.top - 8 - maxHeight)
    : anchor.bottom + 8;

  return { top, left, width, maxHeight };
}

/**
 * Language picker — persists via `umtuba_locale` cookie and refreshes RSC tree
 * so root `html lang` / `dir` update immediately.
 *
 * Never uses a native select control. Windows Chromium RTL native options paint a
 * large blank white popup. The previous in-tree listbox still clipped inside
 * overflow-hidden / backdrop-blur ancestors (auth card, header), so only the
 * first row (العربية) stayed visible. The menu is portaled to document.body,
 * forced LTR, and painted with solid fg/bg on every option.
 */
export default function LanguageSelector({
  id = "umtuba-language",
  className,
  tone = "light",
  variant = "full",
  onLocaleChange,
}: LanguageSelectorProps) {
  const router = useRouter();
  const { locale, t } = useTranslation();
  const options = listSupportedLocales();
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<MenuBox | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const isDark = tone === "dark";
  const isCompact = variant === "compact";

  function handleChange(next: AppLocale) {
    if (next === locale) return;

    if (onLocaleChange) {
      onLocaleChange(next);
      return;
    }

    applyDocumentLocale(next, "explicit");
    router.refresh();
  }

  useLayoutEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }

    function update() {
      const anchor = triggerRef.current?.getBoundingClientRect();
      if (!anchor) return;
      setBox(placeLocaleMenu(anchor));
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(next: AppLocale) {
    setOpen(false);
    handleChange(next);
  }

  const darkMenu = isDark;
  const menu = open ? (
    <ul
      ref={menuRef}
      id={listId}
      role="listbox"
      dir="ltr"
      data-locale-menu="portaled"
      aria-label={t("settings.language")}
      style={{
        position: "fixed",
        top: box?.top ?? -9999,
        left: box?.left ?? -9999,
        width: box?.width ?? MENU_MIN_WIDTH,
        maxHeight: box?.maxHeight ?? MENU_MAX_HEIGHT,
        zIndex: 10000,
        overflowY: "auto",
        isolation: "isolate",
        colorScheme: darkMenu ? "dark" : "light",
        background: darkMenu ? "#0b0c16" : "#ffffff",
        color: darkMenu ? "#f7f8fb" : "#18181b",
        border: darkMenu ? "1px solid rgba(255,255,255,0.22)" : "1px solid #d4d4d8",
        borderRadius: 16,
        padding: "6px 0",
        margin: 0,
        listStyle: "none",
        boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
      }}
    >
      {options.map((entry) => {
        const selected = entry.code === locale;
        return (
          <li key={entry.code} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={selected}
              data-locale-option={entry.code}
              dir="ltr"
              style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 14px",
                textAlign: "left",
                fontSize: 15,
                lineHeight: 1.45,
                cursor: "pointer",
                border: 0,
                background: selected
                  ? darkMenu
                    ? "rgba(59,130,246,0.32)"
                    : "#dbeafe"
                  : "transparent",
                color: selected
                  ? darkMenu
                    ? "#e8f1ff"
                    : "#1e3a8a"
                  : darkMenu
                    ? "#f7f8fb"
                    : "#18181b",
              }}
              onClick={() => pick(entry.code)}
            >
              <span
                dir={entry.direction}
                style={{ fontWeight: 600, color: "inherit" }}
              >
                {entry.nativeName}
              </span>
              <span
                style={{
                  flexShrink: 0,
                  fontSize: 12,
                  fontWeight: 600,
                  color: darkMenu ? "#d7dce8" : "#3f3f46",
                }}
              >
                {entry.englishName}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  ) : null;

  const portaledMenu =
    menu && typeof document !== "undefined"
      ? createPortal(menu, document.body)
      : menu;

  if (isCompact) {
    return (
      <div
        ref={rootRef}
        className={
          className ??
          "relative inline-flex h-8 w-11 shrink-0 items-center justify-center"
        }
      >
        <button
          ref={triggerRef}
          id={id}
          type="button"
          aria-label={t("settings.language")}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          className={
            isDark
              ? "watch-focus-ring relative z-[2] flex h-8 w-11 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-white/5 text-[11px] font-black text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300/60"
              : "watch-focus-ring relative z-[2] flex h-8 w-11 cursor-pointer items-center justify-center rounded-md border border-zinc-300 bg-white text-[11px] font-black text-zinc-900"
          }
          onClick={() => setOpen((current) => !current)}
        >
          <span className="sr-only">{t("settings.language")}</span>
          <span data-locale-code={locale} aria-hidden>
            {compactLocaleLabel(locale)}
          </span>
        </button>
        {portaledMenu}
      </div>
    );
  }

  const selected = options.find((entry) => entry.code === locale);

  return (
    <div
      ref={rootRef}
      className={
        className ??
        `relative flex flex-col gap-1 text-sm ${isDark ? "text-white" : "text-zinc-900"}`
      }
    >
      <span
        className={`font-medium ${isDark ? "text-white" : "text-zinc-800"}`}
      >
        {t("settings.language")}
      </span>
      <span className={`text-xs ${isDark ? "app-ink-secondary" : "text-zinc-500"}`}>
        {t("settings.languageDescription")}
      </span>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-label={t("settings.language")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={
          isDark
            ? "mt-1 flex w-full items-center justify-between rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white"
            : "mt-1 flex w-full items-center justify-between rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
        }
        onClick={() => setOpen((current) => !current)}
      >
        <span data-locale-code={locale}>{selected?.nativeName ?? locale}</span>
        <span aria-hidden className={isDark ? "app-ink-muted" : "text-zinc-400"}>
          ▾
        </span>
      </button>
      {portaledMenu}
    </div>
  );
}
