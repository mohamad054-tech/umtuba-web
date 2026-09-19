export const POSTHOG_KEY_ENV = "NEXT_PUBLIC_POSTHOG_KEY";
export const POSTHOG_HOST_ENV = "NEXT_PUBLIC_POSTHOG_HOST";
export const DEFAULT_POSTHOG_HOST = "https://eu.i.posthog.com";
export const POSTHOG_EU_ASSETS_ORIGIN = "https://eu-assets.i.posthog.com";
export const POSTHOG_EU_UI_HOST = "https://eu.posthog.com";

export const ANALYTICS_CONSENT_STORAGE_KEY = "umtuba.analytics.consent.v1";
export const ANALYTICS_FIRST_TOUCH_STORAGE_KEY = "umtuba.analytics.first_touch.v1";

export const POSTHOG_EU_CONNECT_ORIGINS = [
  "https://eu.i.posthog.com",
  POSTHOG_EU_ASSETS_ORIGIN,
] as const;

type EnvLike = Record<string, string | undefined>;

export function readPosthogKey(env: EnvLike = process.env): string {
  return env[POSTHOG_KEY_ENV]?.trim() ?? "";
}

export function readPosthogHost(env: EnvLike = process.env): string {
  const raw = env[POSTHOG_HOST_ENV]?.trim();
  return raw || DEFAULT_POSTHOG_HOST;
}

export function isAnalyticsConfigured(env: EnvLike = process.env): boolean {
  return Boolean(readPosthogKey(env));
}

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
