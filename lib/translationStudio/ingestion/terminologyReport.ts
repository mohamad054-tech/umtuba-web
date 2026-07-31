/**
 * Terminology / consistency validation for App Shell catalog values.
 * Warnings only — never auto-replaces approved translations.
 */

import { detectTerminologyConflicts } from "../workflow/terminologyGuard";
import type {
  PersistedStudioState,
  TerminologyConflict,
  TerminologyEntry,
} from "../types";
import { isAppShellCatalogKey, namespaceOfKey } from "./appShellInventory";

export type AppShellTerminologyFindings = {
  conflictingArabic: Array<{
    key: string;
    sourceText: string;
    arabicValue: string;
    conflicts: TerminologyConflict[];
  }>;
  inconsistentEnglishCapitalization: Array<{
    label: string;
    variants: string[];
    keys: string[];
  }>;
  duplicateLabelsDifferentTranslations: Array<{
    sourceText: string;
    arabicVariants: Array<{ key: string; value: string }>;
  }>;
  englishLeakageInArabic: Array<{
    key: string;
    sourceText: string;
    arabicValue: string;
  }>;
};

function looksLikeEnglishLeakage(value: string, source: string): boolean {
  const v = value.trim();
  const s = source.trim();
  if (!v) return false;
  if (v === s) return true;
  // Latin letters without Arabic script → likely leakage for AR UI copy
  const hasArabic = /[\u0600-\u06FF]/.test(v);
  const hasLatin = /[A-Za-z]{3,}/.test(v);
  return !hasArabic && hasLatin;
}

export function validateAppShellTerminology(
  state: PersistedStudioState,
  terminology: TerminologyEntry[] = state.terminology
): AppShellTerminologyFindings {
  const appKeys = state.keys.filter((k) => isAppShellCatalogKey(k.key));
  const keyById = new Map(appKeys.map((k) => [k.id, k]));

  const conflictingArabic: AppShellTerminologyFindings["conflictingArabic"] =
    [];
  const englishLeakageInArabic: AppShellTerminologyFindings["englishLeakageInArabic"] =
    [];

  for (const value of state.values) {
    if (value.language !== "ar") continue;
    const key = keyById.get(value.keyId);
    if (!key) continue;

    const conflicts = detectTerminologyConflicts({
      candidateText: value.value,
      language: "ar",
      terminology,
    });
    if (conflicts.length > 0) {
      conflictingArabic.push({
        key: key.key,
        sourceText: key.sourceText,
        arabicValue: value.value,
        conflicts,
      });
    }

    if (looksLikeEnglishLeakage(value.value, key.sourceText)) {
      englishLeakageInArabic.push({
        key: key.key,
        sourceText: key.sourceText,
        arabicValue: value.value,
      });
    }
  }

  // English capitalization consistency (same lowercase label, different casing)
  const enByLower = new Map<string, { variants: Set<string>; keys: string[] }>();
  for (const key of appKeys) {
    const lower = key.sourceText.trim().toLowerCase();
    if (!lower) continue;
    const row = enByLower.get(lower) ?? {
      variants: new Set<string>(),
      keys: [],
    };
    row.variants.add(key.sourceText.trim());
    row.keys.push(key.key);
    enByLower.set(lower, row);
  }
  const inconsistentEnglishCapitalization: AppShellTerminologyFindings["inconsistentEnglishCapitalization"] =
    [];
  for (const [label, row] of enByLower) {
    if (row.variants.size > 1) {
      inconsistentEnglishCapitalization.push({
        label,
        variants: [...row.variants],
        keys: row.keys,
      });
    }
  }

  // Duplicate EN source with different AR translations
  const arBySource = new Map<
    string,
    Array<{ key: string; value: string }>
  >();
  for (const value of state.values) {
    if (value.language !== "ar" || !value.value.trim()) continue;
    const key = keyById.get(value.keyId);
    if (!key) continue;
    const source = key.sourceText.trim().toLowerCase();
    const list = arBySource.get(source) ?? [];
    list.push({ key: key.key, value: value.value.trim() });
    arBySource.set(source, list);
  }
  const duplicateLabelsDifferentTranslations: AppShellTerminologyFindings["duplicateLabelsDifferentTranslations"] =
    [];
  for (const [sourceText, variants] of arBySource) {
    const unique = new Set(variants.map((v) => v.value));
    if (unique.size > 1) {
      duplicateLabelsDifferentTranslations.push({
        sourceText,
        arabicVariants: variants,
      });
    }
  }

  return {
    conflictingArabic,
    inconsistentEnglishCapitalization,
    duplicateLabelsDifferentTranslations,
    englishLeakageInArabic,
  };
}

export function summarizeFindings(findings: AppShellTerminologyFindings): {
  conflictCount: number;
  leakageCount: number;
  capitalizationIssues: number;
  duplicateTranslationIssues: number;
} {
  return {
    conflictCount: findings.conflictingArabic.length,
    leakageCount: findings.englishLeakageInArabic.length,
    capitalizationIssues: findings.inconsistentEnglishCapitalization.length,
    duplicateTranslationIssues:
      findings.duplicateLabelsDifferentTranslations.length,
  };
}

export function appShellKeysByNamespace(
  state: PersistedStudioState
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of state.keys) {
    if (!isAppShellCatalogKey(key.key)) continue;
    const ns = namespaceOfKey(key.key);
    out[ns] = (out[ns] ?? 0) + 1;
  }
  return out;
}
