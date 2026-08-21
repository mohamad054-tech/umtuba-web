"use client";

import { useEffect, useId, useRef, useState } from "react";
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

/**
 * Language picker — persists via `umtuba_locale` cookie and refreshes RSC tree
 * so root `html lang` / `dir` update immediately.
 *
 * Uses a custom listbox instead of a native select control. Windows Chromium
 * native selects inside RTL documents paint a large blank white popup and hide
 * non-English option glyphs. The menu is forced LTR so every locale is visible.
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
  const rootRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
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

  const menu = (
    <ul
      id={listId}
      role="listbox"
      dir="ltr"
      aria-label={t("settings.language")}
      className={`absolute z-[80] max-h-72 min-w-[16rem] overflow-y-auto rounded-2xl border py-1 shadow-[0_18px_40px_rgba(0,0,0,0.45)] ${
        isDark
          ? "border-white/15 bg-[#0c0c18] text-[#f4f5f8]"
          : "border-zinc-200 bg-white text-zinc-900"
      } ${isCompact ? "end-0 top-full mt-2" : "inset-inline-start-0 top-full z-[80] mt-1 w-full"}`}
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
              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition ${
                selected
                  ? isDark
                    ? "bg-blue-500/20 text-[#dbeafe]"
                    : "bg-blue-50 text-blue-900"
                  : isDark
                    ? "hover:bg-white/10"
                    : "hover:bg-zinc-100"
              }`}
              onClick={() => pick(entry.code)}
            >
              <span className="font-semibold">{entry.nativeName}</span>
              <span
                className={`shrink-0 text-xs ${
                  isDark ? "app-ink-muted" : "text-zinc-500"
                }`}
              >
                {entry.englishName}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );

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
        {open ? menu : null}
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
      {open ? menu : null}
    </div>
  );
}
