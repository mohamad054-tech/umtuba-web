import type { AppLocale } from "../i18n/locales";
import { translate, type TranslationKey } from "../i18n";
import type { WorldFeatureFlags } from "./discovery";

/** Public World Discovery is live only when schema exists and the flag is on. */
export function isWorldDiscoveryPubliclyLive(input: {
  databaseReady: boolean;
  flags: Pick<WorldFeatureFlags, "worldDiscoveryEnabled">;
}): boolean {
  return input.databaseReady && input.flags.worldDiscoveryEnabled;
}

export function worldDiscoveryHoldKey(
  databaseReady: boolean
): TranslationKey {
  return databaseReady ? "world.hold.flagOff" : "world.hold.migrations";
}

export function worldSearchHoldKey(databaseReady: boolean): TranslationKey {
  return databaseReady
    ? "world.search.hold.flagOff"
    : "world.search.hold.migrations";
}

export function worldDiscoveryHoldMessage(
  databaseReady: boolean,
  locale: AppLocale = "en"
): string {
  return translate(locale, worldDiscoveryHoldKey(databaseReady));
}

export function worldSearchHoldMessage(
  databaseReady: boolean,
  locale: AppLocale = "en"
): string {
  return translate(locale, worldSearchHoldKey(databaseReady));
}

const DISCOVERY_ERROR_KEYS: Record<string, TranslationKey> = {
  "Location coordinates must be provided together.":
    "world.error.coordsTogether",
  "Location coordinates are invalid.": "world.error.coordsInvalid",
  "Choose a destination or share one-time location.":
    "world.error.chooseDestination",
  "Place category is invalid.": "world.error.invalidCategory",
  "World Discovery is not available yet.": "world.error.unavailable",
  "Choose a valid destination.": "world.error.invalidDestination",
  "Places could not be loaded.": "world.error.loadPlaces",
};

const SEARCH_ERROR_KEYS: Record<string, TranslationKey> = {
  "Search must contain 2 to 80 characters.": "world.error.searchLength",
  "Search type is invalid.": "world.error.searchType",
  "Search filter is invalid.": "world.error.searchFilter",
  "World Discovery is not available yet.": "world.error.unavailable",
  "World search could not be completed.": "world.error.searchFailed",
};

export function localizeWorldDiscoveryError(
  locale: AppLocale,
  message: string
): string {
  const key = DISCOVERY_ERROR_KEYS[message] ?? "world.error.loadPlaces";
  return translate(locale, key);
}

export function localizeWorldSearchError(
  locale: AppLocale,
  message: string
): string {
  const key = SEARCH_ERROR_KEYS[message] ?? "world.error.searchFailed";
  return translate(locale, key);
}
