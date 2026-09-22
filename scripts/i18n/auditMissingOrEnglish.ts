/**
 * Lists every English catalog key that is missing or still identical
 * to the English string in another locale.
 *
 * Usage: npx tsx scripts/i18n/auditMissingOrEnglish.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { MESSAGE_CATALOGS } from "../../lib/i18n/messages/catalogs";
import { SUPPORTED_LOCALES, type AppLocale } from "../../lib/i18n/locales";
import type { TranslationKey } from "../../lib/i18n/messages/types";

type Row = {
  locale: AppLocale;
  missing: TranslationKey[];
  identical: TranslationKey[];
};

const BRAND_IDENTICAL_OK = new Set<string>([
  "UMTUBA",
  "UM Life",
  "OK",
  "CPU",
  "Sudoku",
  "2048",
  "UNO",
]);

function isBrandOrUntranslatable(value: string): boolean {
  const trimmed = value.trim();
  if (BRAND_IDENTICAL_OK.has(trimmed)) return true;
  if (/^W · D · L$/.test(trimmed)) return true;
  if (/^\{[a-zA-Z0-9_]+\}$/.test(trimmed)) return true;
  return false;
}

function prefixOf(key: string): string {
  const parts = key.split(".");
  return parts.length > 1 ? parts[0] : key;
}

const en = MESSAGE_CATALOGS.en;
const enKeys = Object.keys(en) as TranslationKey[];
const rows: Row[] = [];

for (const locale of SUPPORTED_LOCALES) {
  if (locale === "en") continue;
  const catalog = MESSAGE_CATALOGS[locale];
  const missing: TranslationKey[] = [];
  const identical: TranslationKey[] = [];
  for (const key of enKeys) {
    const value = catalog[key];
    if (typeof value !== "string" || value.trim().length === 0) {
      missing.push(key);
      continue;
    }
    if (locale === "ar") continue;
    if (value === en[key] && !isBrandOrUntranslatable(value)) {
      identical.push(key);
    }
  }
  rows.push({ locale, missing, identical });
}

const summary = rows.map((row) => ({
  locale: row.locale,
  missingCount: row.missing.length,
  identicalCount: row.identical.length,
  byPrefix: [...row.missing, ...row.identical].reduce<Record<string, number>>(
    (acc, key) => {
      const prefix = prefixOf(key);
      acc[prefix] = (acc[prefix] ?? 0) + 1;
      return acc;
    },
    {}
  ),
}));

const report = {
  generatedAt: new Date().toISOString(),
  englishKeyCount: enKeys.length,
  summary,
  locales: rows.map((row) => ({
    locale: row.locale,
    missing: row.missing,
    identical: row.identical,
  })),
};

const outPath = join(process.cwd(), "tmp-i18n-audit.json");
writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

console.log(`English keys: ${enKeys.length}`);
for (const row of summary) {
  console.log(
    `${row.locale}: missing=${row.missingCount} identical=${row.identicalCount}`
  );
  const prefixes = Object.entries(row.byPrefix).sort((a, b) => b[1] - a[1]);
  for (const [prefix, count] of prefixes.slice(0, 12)) {
    console.log(`  ${prefix}: ${count}`);
  }
}
console.log(`Wrote ${outPath}`);
