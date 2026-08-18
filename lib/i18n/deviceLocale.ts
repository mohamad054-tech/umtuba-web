/**
 * Client device-locale bridge — same contract as resolveAppLocale.
 * Used when the server missed navigator.language (cached HTML, stripped
 * Accept-Language, first paint). Never overrides a saved cookie preference.
 */

import { LOCALE_QUERY_ALIASES } from "../site/hreflang";
import { normalizeToAppLocale, type AppLocale } from "./locales";
import { resolveSupportedBrowserLocale } from "./resolve";

export type DeviceLocaleBridgeInput = {
  cookiePreference?: string | null;
  urlLocale?: string | null;
  deviceLanguages?: string | string[] | null;
  serverLocale: AppLocale;
};

export type DeviceLocaleBridgePlan =
  | { action: "none" }
  | {
      action: "persist";
      locale: AppLocale;
      reason: "device-mismatch" | "device-persist";
    };

export function readLocaleFromSearch(search: string): AppLocale | null {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  for (const key of LOCALE_QUERY_ALIASES) {
    const normalized = normalizeToAppLocale(params.get(key));
    if (normalized) return normalized;
  }
  return null;
}

export function collectNavigatorLanguages(
  nav: Pick<Navigator, "language" | "languages"> | null | undefined
): string[] {
  if (!nav) return [];
  const listed = Array.isArray(nav.languages) ? [...nav.languages] : [];
  if (nav.language) listed.push(nav.language);
  return listed.filter((tag) => typeof tag === "string" && tag.length > 0);
}

export function planDeviceLocaleBridge(
  input: DeviceLocaleBridgeInput
): DeviceLocaleBridgePlan {
  if (normalizeToAppLocale(input.cookiePreference)) {
    return { action: "none" };
  }

  if (normalizeToAppLocale(input.urlLocale)) {
    return { action: "none" };
  }

  const device = resolveSupportedBrowserLocale(input.deviceLanguages);
  if (!device) {
    return { action: "none" };
  }

  if (device !== input.serverLocale) {
    return { action: "persist", locale: device, reason: "device-mismatch" };
  }

  return { action: "persist", locale: device, reason: "device-persist" };
}
