import { toWorldCatalogLocaleKey, type AppLocale } from "../i18n/locales";

export const PRODUCT_CATALOG_LOCALES = [
  "ar",
  "en",
  "fr",
  "es",
  "de",
  "pt",
] as const;

export const WAVE2_CATALOG_LOCALES = [
  "tr",
  "id",
  "zh",
  "hi",
  "ja",
  "ru",
  "ko",
] as const;

export type ProductCatalogLocale = (typeof PRODUCT_CATALOG_LOCALES)[number];
export type Wave2CatalogLocale = (typeof WAVE2_CATALOG_LOCALES)[number];
export type CatalogLocale = ProductCatalogLocale | Wave2CatalogLocale;

export type CatalogLocaleMap = Partial<Record<CatalogLocale, string>>;

export function isCatalogLocale(value: string): value is CatalogLocale {
  return (
    (PRODUCT_CATALOG_LOCALES as readonly string[]).includes(value) ||
    (WAVE2_CATALOG_LOCALES as readonly string[]).includes(value)
  );
}

export function resolveCatalogLocaleText(
  locale: AppLocale,
  localized: CatalogLocaleMap | undefined,
  fallback: string | null | undefined
): string | null {
  const catalogKey = toWorldCatalogLocaleKey(locale);
  const fromExact = localized?.[locale as CatalogLocale]?.trim();
  if (fromExact) return fromExact;
  const fromLocale = localized?.[catalogKey as CatalogLocale]?.trim();
  if (fromLocale) return fromLocale;
  const fromEnglish = localized?.en?.trim();
  if (fromEnglish) return fromEnglish;
  const fromFallback = fallback?.trim();
  return fromFallback || null;
}
