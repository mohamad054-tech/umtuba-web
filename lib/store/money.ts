const CURRENCY_RE = /^[A-Z]{3}$/;

export type MoneyValidationResult =
  | { ok: true; amountMinor: number; currency: string }
  | { ok: false; message: string };

export function isValidCurrencyCode(currency: string): boolean {
  return CURRENCY_RE.test(currency.trim().toUpperCase());
}

export function normalizeCurrencyCode(currency: string): string {
  return currency.trim().toUpperCase();
}

/**
 * Validate minor-unit money. Rejects floats, NaN, negatives, and unsafe integers.
 */
export function validateAmountMinor(
  value: unknown,
  currency: string
): MoneyValidationResult {
  const normalizedCurrency = normalizeCurrencyCode(currency);
  if (!isValidCurrencyCode(normalizedCurrency)) {
    return { ok: false, message: "Currency must be a 3-letter ISO code." };
  }

  if (typeof value === "string" && value.trim() !== "") {
    if (!/^-?\d+$/.test(value.trim())) {
      return { ok: false, message: "Amount must be a whole number in minor units." };
    }
    value = Number(value.trim());
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { ok: false, message: "Amount must be a finite number." };
  }

  if (!Number.isInteger(value)) {
    return { ok: false, message: "Amount must use integer minor units (no decimals)." };
  }

  if (value < 0) {
    return { ok: false, message: "Amount cannot be negative." };
  }

  if (value > Number.MAX_SAFE_INTEGER) {
    return { ok: false, message: "Amount is too large." };
  }

  return { ok: true, amountMinor: value, currency: normalizedCurrency };
}

export function formatMinorUnits(amountMinor: number, currency: string): string {
  const code = normalizeCurrencyCode(currency);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
    }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${code}`;
  }
}

export function majorToMinorUnits(major: unknown): number | null {
  if (typeof major === "number" && Number.isFinite(major)) {
    return Math.round(major * 100);
  }
  if (typeof major === "string" && major.trim() !== "") {
    const n = Number(major.trim());
    if (!Number.isFinite(n)) return null;
    return Math.round(n * 100);
  }
  return null;
}
