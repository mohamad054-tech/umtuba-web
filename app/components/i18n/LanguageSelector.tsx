"use client";

import { useRouter } from "next/navigation";
import {
  buildLocaleDocumentCookie,
  listSupportedLocales,
  type AppLocale,
} from "../../../lib/i18n";
import { useTranslation } from "./I18nProvider";

type LanguageSelectorProps = {
  id?: string;
  className?: string;
  /**
   * Optional controlled change handler. When omitted, persists cookie and refreshes.
   */
  onLocaleChange?: (locale: AppLocale) => void;
};

/**
 * Minimal reusable language selector (foundation contract).
 * Not wired into Settings/App shell screens in V1 — safe for future integration.
 */
export default function LanguageSelector({
  id = "umtuba-language",
  className,
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

    document.cookie = buildLocaleDocumentCookie(selected);
    router.refresh();
  }

  return (
    <label className={className ?? "flex flex-col gap-1 text-sm"}>
      <span className="font-medium text-zinc-800">{t("settings.language")}</span>
      <span className="text-xs text-zinc-500">
        {t("settings.languageDescription")}
      </span>
      <select
        id={id}
        name="locale"
        value={locale}
        aria-label={t("settings.language")}
        className="mt-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
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
