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

let missingKeyWarned = false;

/**
 * Next.js only inlines NEXT_PUBLIC_* when the identifier is a literal
 * (`process.env.NEXT_PUBLIC_POSTHOG_KEY`). A computed key is undefined
 * in the browser bundle.
 */
export function readPosthogKey(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() ?? "";
}

export function readPosthogHost(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_HOST;
}

export function isAnalyticsConfigured(): boolean {
  const configured = Boolean(readPosthogKey());
  if (!configured) {
    warnMissingPosthogKeyOnce();
  }
  return configured;
}

function warnMissingPosthogKeyOnce(): void {
  if (missingKeyWarned) return;
  if (process.env.NODE_ENV !== "development") return;
  if (typeof window === "undefined") return;
  missingKeyWarned = true;
  console.warn(
    "PostHog analytics is disabled: NEXT_PUBLIC_POSTHOG_KEY is missing. Set it in .env.local."
  );
}

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
