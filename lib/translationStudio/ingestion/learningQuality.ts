/**
 * Learning quality / consistency findings (warnings only — never auto-correct).
 */

import { detectTerminologyConflicts } from "../workflow/terminologyGuard";
import type { PersistedStudioState } from "../types";
import { isLearningCatalogKey } from "./learningInventory";

export type LearningQualityFindings = {
  duplicateLabels: Array<{
    sourceText: string;
    keys: string[];
  }>;
  terminologyConflicts: Array<{
    key: string;
    arabicValue: string;
    terms: string[];
  }>;
  englishLeakage: Array<{ key: string; arabicValue: string }>;
  placeholderIssues: Array<{ key: string; language: string; detail: string }>;
  missingTranslations: Array<{ key: string; language: string }>;
  staleTranslations: Array<{ key: string; language: string; status: string }>;
};

const PLACEHOLDER_RE = /\{[^}]+\}|%\d+\$[sd]/g;

export function validateLearningCatalogQuality(
  state: PersistedStudioState
): LearningQualityFindings {
  const learningKeys = state.keys.filter((k) => isLearningCatalogKey(k.key));
  const keyById = new Map(learningKeys.map((k) => [k.id, k]));

  const bySource = new Map<string, string[]>();
  for (const key of learningKeys) {
    const src = key.sourceText.trim().toLowerCase();
    const list = bySource.get(src) ?? [];
    list.push(key.key);
    bySource.set(src, list);
  }
  const duplicateLabels = [...bySource.entries()]
    .filter(([, keys]) => keys.length > 1)
    .map(([sourceText, keys]) => ({ sourceText, keys }));

  const terminologyConflicts: LearningQualityFindings["terminologyConflicts"] =
    [];
  const englishLeakage: LearningQualityFindings["englishLeakage"] = [];
  const placeholderIssues: LearningQualityFindings["placeholderIssues"] = [];
  const missingTranslations: LearningQualityFindings["missingTranslations"] =
    [];
  const staleTranslations: LearningQualityFindings["staleTranslations"] = [];

  for (const value of state.values) {
    const key = keyById.get(value.keyId);
    if (!key) continue;

    if (value.status === "missing") {
      missingTranslations.push({ key: key.key, language: value.language });
    }
    if (value.status === "needs_review" && value.language !== "en") {
      staleTranslations.push({
        key: key.key,
        language: value.language,
        status: value.status,
      });
    }

    const srcPh = [...key.sourceText.matchAll(PLACEHOLDER_RE)].map((m) => m[0]!);
    const tgtPh = [...value.value.matchAll(PLACEHOLDER_RE)].map((m) => m[0]!);
    const missing = srcPh.filter((p) => !tgtPh.includes(p));
    if (missing.length > 0 && value.value.trim()) {
      placeholderIssues.push({
        key: key.key,
        language: value.language,
        detail: `Missing placeholders: ${missing.join(", ")}`,
      });
    }

    if (value.language === "ar") {
      if (
        value.value.trim() === key.sourceText.trim() ||
        (/[A-Za-z]{3,}/.test(value.value) &&
          !/[\u0600-\u06FF]/.test(value.value))
      ) {
        englishLeakage.push({ key: key.key, arabicValue: value.value });
      }
      const conflicts = detectTerminologyConflicts({
        candidateText: value.value,
        language: "ar",
        terminology: state.terminology,
      });
      if (conflicts.length > 0) {
        terminologyConflicts.push({
          key: key.key,
          arabicValue: value.value,
          terms: conflicts.map((c) => c.term),
        });
      }
    }
  }

  return {
    duplicateLabels,
    terminologyConflicts,
    englishLeakage,
    placeholderIssues,
    missingTranslations,
    staleTranslations,
  };
}
