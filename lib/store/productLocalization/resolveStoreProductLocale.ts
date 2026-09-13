import type { AppLocale } from "../../i18n/locales";
import { isRequiredStoreLocale, type StoreLocale } from "./requiredLocales";

/**
 * Product-copy locale for the approved Store catalog.
 * Chrome stays on AppLocale via resolveRequestLocale(); products may use the
 * full 13-locale Store set when umtuba_locale holds a Store locale.
 */
export function resolveStoreProductLocale(input: {
  requestLocale: AppLocale;
  rawCookie?: string | null;
}): StoreLocale {
  const raw = input.rawCookie?.trim();
  if (raw) {
    if (isRequiredStoreLocale(raw)) return raw;
    if (raw.toLowerCase() === "zh-cn") return "zh-CN";
  }
  if (isRequiredStoreLocale(input.requestLocale)) return input.requestLocale;
  return "en";
}
