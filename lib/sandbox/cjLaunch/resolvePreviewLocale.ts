import {
  getLocaleDirection,
  type AppLocale,
  type TextDirection,
} from "../../i18n/locales";

export type CjLaunchStoreLocale = "ar" | "en";

export type CjLaunchPreviewLocale = {
  locale: CjLaunchStoreLocale;
  direction: TextDirection;
  rtlOverride: boolean;
};

/**
 * Bind cj-launch product copy to the request locale.
 * Catalog overlay is AR/EN only. `?dir=rtl` remains an explicit Arabic/RTL override.
 */
export function resolveCjLaunchPreviewLocale(input: {
  requestLocale: AppLocale;
  dirParam?: string | null;
}): CjLaunchPreviewLocale {
  const rtlOverride = input.dirParam === "rtl";
  const locale: CjLaunchStoreLocale =
    rtlOverride || input.requestLocale === "ar" ? "ar" : "en";
  return {
    locale,
    direction: getLocaleDirection(locale),
    rtlOverride,
  };
}
