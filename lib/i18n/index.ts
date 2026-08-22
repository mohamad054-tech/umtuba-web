export {
  DEFAULT_LOCALE,
  FUTURE_LOCALE_CODES,
  LOCALE_DEFINITIONS,
  SUPPORTED_LOCALES,
  compactLocaleLabel,
  getLocaleDefinition,
  getLocaleDirection,
  isAppLocale,
  listSupportedLocales,
  matchSupportedLocale,
  normalizeToAppLocale,
  resolveLocaleOrFallback,
  toWorldCatalogLocaleKey,
  type AppLocale,
  type LocaleDefinition,
  type TextDirection,
} from "./locales";

export {
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
  LOCALE_SOURCE_COOKIE_NAME,
  buildLocaleDocumentCookie,
  buildLocaleSourceDocumentCookie,
  localeCookieOptions,
  parseLocaleCookieValue,
  persistLocaleDocumentCookies,
  applyDocumentLocale,
  readDocumentCookie,
  readSavedLocaleFromDocument,
  type LocalePreferenceSource,
} from "./cookie";

export {
  parseAcceptLanguageHeader,
  resolveAppLocale,
  resolveSupportedBrowserLocale,
  type LocaleResolutionInput,
} from "./resolve";

export {
  collectNavigatorLanguages,
  planDeviceLocaleBridge,
  readLocaleFromSearch,
  type DeviceLocaleBridgeInput,
  type DeviceLocaleBridgePlan,
} from "./deviceLocale";

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

export {
  CARD_BADGE_I18N_KEYS,
  CARD_KIND_I18N_KEYS,
  LIVE_BUCKET_I18N_KEYS,
  PROFILE_CERT_KEYS,
  PROFILE_TAB_I18N_KEYS,
  activityTierLabelKey,
  activityTierTitleKey,
  formatLocalizedJoinedBody,
  formatLocalizedJoinedLine,
} from "./profileChrome";
