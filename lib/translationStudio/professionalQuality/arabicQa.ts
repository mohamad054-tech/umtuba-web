/**
 * Arabic-specific deterministic QA (safe heuristics only).
 */

import type { TranslationQualityDimension, TranslationQualityFinding } from "./types";
import type { OfficialTerminologyEntry } from "./terminologyPolicy";

const ARABIC_RE = /[\u0600-\u06FF]/;
const PLACEHOLDER_RE = /\{[a-zA-Z_][\w]*\}|\{\{[^{}]+\}\}|%\d*\$?[sd]|%[sd]/g;

export function runArabicDeterministicChecks(input: {
  sourceText: string;
  targetText: string;
  glossaryTerms: OfficialTerminologyEntry[];
}): {
  findings: TranslationQualityFinding[];
  scoreCaps: Partial<Record<TranslationQualityDimension, number>>;
} {
  const findings: TranslationQualityFinding[] = [];
  const scoreCaps: Partial<Record<TranslationQualityDimension, number>> = {};
  const target = input.targetText;
  if (!target.trim()) return { findings, scoreCaps };

  // Accidental Latin-only punctuation runs between Arabic letters (heuristic).
  if (
    ARABIC_RE.test(target) &&
    /[\u0600-\u06FF]\s*[,]{2,}|\(\s*\)/.test(target)
  ) {
    findings.push({
      code: "arabic_ltr_punct_anomaly",
      severity: "warning",
      dimension: "locale_conventions",
      message: "Suspicious LTR punctuation pattern in Arabic target",
    });
    scoreCaps.locale_conventions = 75;
  }

  // Obvious untranslated English UI tokens that are not protected brands.
  const protectedBrandTerms = new Set(
    input.glossaryTerms
      .filter((t) => t.doNotTranslate)
      .map((t) => t.sourceTerm.toLowerCase())
  );
  const englishTokens = target.match(/\b[A-Za-z]{4,}\b/g) ?? [];
  const suspicious = englishTokens.filter(
    (t) => !protectedBrandTerms.has(t.toLowerCase()) && !input.sourceText.includes(t)
  );
  // Only flag if Arabic script is present and many non-protected Latin tokens remain.
  if (ARABIC_RE.test(target) && suspicious.length >= 3) {
    findings.push({
      code: "arabic_untranslated_token",
      severity: "warning",
      dimension: "fluency_naturalness",
      message: `Multiple non-protected Latin tokens in Arabic target: ${suspicious.slice(0, 5).join(", ")}`,
    });
    scoreCaps.fluency_naturalness = 70;
  }

  // Numbers/placeholders must not be corrupted (digits altered inside placeholders).
  const srcPh = [...input.sourceText.matchAll(PLACEHOLDER_RE)].map((m) => m[0]!);
  for (const ph of srcPh) {
    if (!target.includes(ph)) {
      findings.push({
        code: "number_placeholder_corruption",
        severity: "blocking",
        dimension: "placeholder_integrity",
        message: `Placeholder/token missing or corrupted in Arabic target: ${ph}`,
      });
      scoreCaps.placeholder_integrity = 0;
    }
  }

  return { findings, scoreCaps };
}
