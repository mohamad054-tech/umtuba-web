"use client";

import { useRouter } from "next/navigation";
import {
  buildLocaleDocumentCookie,
  getLocaleDirection,
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
 * Language selector — persists via `umtuba_locale` cookie and refreshes RSC tree
 * so root `html lang` / `dir` update immediately.
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

  function handleChange(next: string) {
    const selected = options.find((entry) => entry.code === next)?.code;
    if (!selected || selected === locale) return;

    if (onLocaleChange) {
      onLocaleChange(selected);
      return;
    }

    // Immediate document direction before RSC refresh settles.
    document.documentElement.lang = selected;
    document.documentElement.dir = getLocaleDirection(selected);
    document.cookie = buildLocaleDocumentCookie(selected);
    router.refresh();
  }

  const isDark = tone === "dark";
  const isCompact = variant === "compact";

  if (isCompact) {
    return (
      <label
        className={
          className ??
          "inline-flex items-center gap-1.5 text-xs font-bold text-white/70"
        }
      >
        <span className="sr-only">{t("settings.language")}</span>
        <select
          id={id}
          name="locale"
          value={locale}
          aria-label={t("settings.language")}
          className={
            isDark
              ? "watch-focus-ring max-w-[7.5rem] rounded-full border border-white/15 bg-white/5 px-2 py-1.5 text-[11px] font-bold text-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300/60"
              : "watch-focus-ring max-w-[7.5rem] rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-[11px] font-bold text-zinc-900"
          }
          onChange={(event) => handleChange(event.target.value)}
        >
          {options.map((entry) => (
            <option key={entry.code} value={entry.code} dir={entry.direction}>
              {entry.nativeName}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label
      className={
        className ??
        `flex flex-col gap-1 text-sm ${isDark ? "text-white" : "text-zinc-900"}`
      }
    >
      <span
        className={`font-medium ${isDark ? "text-white" : "text-zinc-800"}`}
      >
        {t("settings.language")}
      </span>
      <span className={`text-xs ${isDark ? "text-white/55" : "text-zinc-500"}`}>
        {t("settings.languageDescription")}
      </span>
      <select
        id={id}
        name="locale"
        value={locale}
        aria-label={t("settings.language")}
        className={
          isDark
            ? "mt-1 rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white"
            : "mt-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
        }
        onChange={(event) => handleChange(event.target.value)}
      >
        {options.map((entry) => (
          <option key={entry.code} value={entry.code} dir={entry.direction}>
            {entry.nativeName}
          </option>
        ))}
      </select>
    </label>
  );
}
