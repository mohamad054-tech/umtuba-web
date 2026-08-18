export {
  DEFAULT_LOCALE,
  LOCALE_DEFINITIONS,
  SUPPORTED_LOCALES,
  compactLocaleLabel,
  getLocaleDefinition,
  getLocaleDirection,
  isAppLocale,
  listSupportedLocales,
  normalizeToAppLocale,
  resolveLocaleOrFallback,
  type AppLocale,
  type LocaleDefinition,
  type TextDirection,
} from "./locales";

export {
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
  buildLocaleDocumentCookie,
  localeCookieOptions,
  parseLocaleCookieValue,
} from "./cookie";

export {
  parseAcceptLanguageHeader,
  resolveAppLocale,
  type LocaleResolutionInput,
} from "./resolve";

export {
  createTranslator,
  translate,
  type TranslateOptions,
} from "./translate";

export {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
} from "./format";

export type { FoundationMessages, TranslationKey } from "./messages/types";
export { MESSAGE_CATALOGS, getMessageCatalog } from "./messages/catalogs";

export {
  desktopNavLabelKey,
  mobileNavLabelKey,
  userMenuGroupLabelKey,
  userMenuItemLabelKey,
} from "./shellLabels";
