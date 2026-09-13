/**
 * Store product localization must cover the authoritative UMTUBA customer locale set.
 * This is independent of this worktree's still-six AppLocale contract.
 * Owner GO: web/Store requirement is authoritative; do not wait for mobile.
 */
export const STORE_REQUIRED_LOCALES = [
  "ar",
  "en",
  "fr",
  "es",
  "de",
  "pt",
  "id",
  "hi",
  "ru",
  "tr",
  "zh-CN",
  "ja",
  "ko",
] as const;

export type StoreLocale = (typeof STORE_REQUIRED_LOCALES)[number];

export const REQUIRED_STORE_LOCALES: readonly StoreLocale[] = STORE_REQUIRED_LOCALES;

export const REQUIRED_STORE_LOCALE_COUNT = REQUIRED_STORE_LOCALES.length;

export const REQUIRED_STORE_LOCALES_EVIDENCE = [
  "Owner GO UMTUBA_STORE_13_LOCALE_BACKFILL_AND_EXPANSION_V1",
  "newer-web lib/i18n/locales.ts SUPPORTED_LOCALES (13)",
  "docs/ai/tasks/UMTUBA_STORE_AUTHORITATIVE_ALL_LOCALES_AUDIT_V1.md",
] as const;

export function isRequiredStoreLocale(value: unknown): value is StoreLocale {
  return typeof value === "string" && (REQUIRED_STORE_LOCALES as readonly string[]).includes(value);
}
