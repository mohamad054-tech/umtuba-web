/**
 * Locale-aware formatting helpers.
 * Presentation only — do not use for business/financial calculation logic.
 */

import { LOCALE_DEFINITIONS, type AppLocale } from "./locales";

function bcp47(locale: AppLocale): string {
  return LOCALE_DEFINITIONS[locale].bcp47;
}

export function formatNumber(
  locale: AppLocale,
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(bcp47(locale), options).format(value);
}

export function formatPercent(
  locale: AppLocale,
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(bcp47(locale), {
    style: "percent",
    ...options,
  }).format(value);
}

export function formatCurrency(
  locale: AppLocale,
  value: number,
  currency: string,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(bcp47(locale), {
    style: "currency",
    currency,
    ...options,
  }).format(value);
}

export function formatDate(
  locale: AppLocale,
  value: Date | number | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat(bcp47(locale), options).format(date);
}
