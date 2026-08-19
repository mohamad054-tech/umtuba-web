"use client";

import {
  createContext,
  createElement,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  getLocaleDirection,
  type AppLocale,
  type TextDirection,
} from "../../../lib/i18n/locales";
import {
  createTranslator,
  type TranslateOptions,
} from "../../../lib/i18n/translate";
import type { TranslationKey } from "../../../lib/i18n/messages/types";
import DeviceLocaleBridge from "./DeviceLocaleBridge";

type I18nContextValue = {
  locale: AppLocale;
  direction: TextDirection;
  t: (key: TranslationKey, options?: TranslateOptions) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  children,
}: {
  locale: AppLocale;
  children: ReactNode;
}) {
  const value = useMemo<I18nContextValue>(() => {
    const t = createTranslator(locale);
    return {
      locale,
      direction: getLocaleDirection(locale),
      t,
    };
  }, [locale]);

  return createElement(
    I18nContext.Provider,
    { value },
    createElement(DeviceLocaleBridge),
    children
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}

/** Client translation hook — requires I18nProvider. */
export function useTranslation() {
  const { locale, direction, t } = useI18n();
  return { locale, direction, t };
}
