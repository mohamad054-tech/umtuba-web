/**
 * Locale-aware formatting helpers.
 * Presentation only — do not use for business/financial calculation logic.
 *
 * Store money (USD) is one system:
 * - LTR: `$49.99`
 * - RTL Arabic: `49.99 US$` with Western digits (never `$US` + Arabic-Indic).
 */

import { getLocaleDirection, LOCALE_DEFINITIONS, type AppLocale } from "./locales";

function bcp47(locale: AppLocale): string {
  return LOCALE_DEFINITIONS[locale].bcp47;
}

const LATIN_AMOUNT = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  numberingSystem: "latn",
});

function latinAmount(value: number): string {
  return LATIN_AMOUNT.format(value);
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
  const code = currency.trim().toUpperCase();
  if (options) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      numberingSystem: "latn",
      ...options,
    }).format(value);
  }
  const amount = latinAmount(value);
  if (getLocaleDirection(locale) === "rtl") {
    return code === "USD" ? `${amount} US$` : `${amount} ${code}`;
  }
  if (code === "USD") {
    return `$${amount}`;
  }
  return new Intl.NumberFormat(bcp47(locale), {
    style: "currency",
    currency: code,
    numberingSystem: "latn",
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
