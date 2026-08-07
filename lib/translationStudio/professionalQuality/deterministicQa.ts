/**
 * Deterministic automated QA engine V1.
 * Heuristics only — does not claim full semantic accuracy.
 */

import type { StudioLanguageCode } from "../types";
import {
  DEFAULT_QUALITY_DIMENSION_WEIGHTS,
  clampScore100,
  computeOverallQualityScore,
  type TranslationQualityDimension,
  type TranslationQualityFinding,
  type TranslationQualityScore,
} from "./types";
import {
  getApprovedTranslation,
  type OfficialTerminologyEntry,
} from "./terminologyPolicy";
import type { LocaleStyleGuide } from "./styleGuides";
import { runArabicDeterministicChecks } from "./arabicQa";

const PLACEHOLDER_PATTERNS: RegExp[] = [
  /\{[a-zA-Z_][\w]*\}/g,
  /\{\{[^{}]+\}\}/g,
  /%\d*\$?[sd]/g,
  /%[sd]/g,
];

const HTML_TAG_RE = /<\/?[a-zA-Z][^>]*>/g;

export type DeterministicQaInput = {
  sourceText: string;
  targetText: string;
  sourceLocale: StudioLanguageCode;
  targetLocale: StudioLanguageCode;
  glossaryTerms?: OfficialTerminologyEntry[];
  styleGuide?: LocaleStyleGuide;
  /** Soft UI length warning when target/source char ratio exceeds. */
  maxLengthRatio?: number;
  maxAbsoluteLength?: number;
};

function extractPlaceholders(text: string): string[] {
  const found = new Set<string>();
  for (const re of PLACEHOLDER_PATTERNS) {
    const copy = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
    for (const m of text.matchAll(copy)) {
      found.add(m[0]!);
    }
  }
  return [...found].sort();
}

function extractTags(text: string): string[] {
  return [...text.matchAll(HTML_TAG_RE)].map((m) => m[0]!.toLowerCase()).sort();
}

function countNewlines(text: string): number {
  return (text.match(/\n/g) ?? []).length;
}

function baseDimensions(
  scores: Partial<Record<TranslationQualityDimension, number>>
): TranslationQualityScore["dimensions"] {
  return (Object.keys(DEFAULT_QUALITY_DIMENSION_WEIGHTS) as TranslationQualityDimension[]).map(
    (dimension) => ({
      dimension,
      score: clampScore100(scores[dimension] ?? 100),
      weight: DEFAULT_QUALITY_DIMENSION_WEIGHTS[dimension],
    })
  );
}

/**
 * Run deterministic QA. Semantic/fluency default to neutral 100 with
 * info that they are not fully judged here (AI reviewer may adjust later).
 */
export function runDeterministicTranslationQa(
  input: DeterministicQaInput
): TranslationQualityScore {
  const findings: TranslationQualityFinding[] = [];
  const scores: Partial<Record<TranslationQualityDimension, number>> = {
    semantic_accuracy: 100,
    terminology_compliance: 100,
    contextual_fit: 100,
    fluency_naturalness: 100,
    ui_conciseness: 100,
    consistency: 100,
    grammar_spelling: 100,
    locale_conventions: 100,
    placeholder_integrity: 100,
    formatting_integrity: 100,
  };

  const source = input.sourceText ?? "";
  const target = input.targetText ?? "";

  if (!target.trim()) {
    findings.push({
      code: "missing_translation",
      severity: "blocking",
      dimension: "semantic_accuracy",
      message: "Target translation is empty",
    });
    scores.semantic_accuracy = 0;
    scores.fluency_naturalness = 0;
  }

  if (
    target.trim() &&
    input.sourceLocale !== input.targetLocale &&
    target.trim() === source.trim()
  ) {
    findings.push({
      code: "source_copy",
      severity: "error",
      dimension: "semantic_accuracy",
      message: "Target is an unchanged copy of the source in a different locale",
    });
    scores.semantic_accuracy = Math.min(scores.semantic_accuracy ?? 100, 40);
  }

  const srcPh = extractPlaceholders(source);
  const tgtPh = extractPlaceholders(target);
  const missingPh = srcPh.filter((p) => !tgtPh.includes(p));
  const extraPh = tgtPh.filter((p) => !srcPh.includes(p));
  if (missingPh.length || extraPh.length) {
    findings.push({
      code: missingPh.length ? "placeholder_missing" : "placeholder_extra",
      severity: "blocking",
      dimension: "placeholder_integrity",
      message: `Placeholder mismatch (missing=${missingPh.join(",") || "—"}, extra=${extraPh.join(",") || "—"})`,
      detail: {
        missing: missingPh.join(","),
        extra: extraPh.join(","),
      },
    });
    scores.placeholder_integrity = 0;
  }

  const srcTags = extractTags(source);
  const tgtTags = extractTags(target);
  if (srcTags.join("\0") !== tgtTags.join("\0")) {
    findings.push({
      code: "html_tag_mismatch",
      severity: "blocking",
      dimension: "formatting_integrity",
      message: "HTML/tag structure mismatch between source and target",
    });
    scores.formatting_integrity = 0;
  }

  if (target !== target.trim() && target.trim().length > 0) {
    findings.push({
      code: "whitespace_leading_trailing",
      severity: "warning",
      dimension: "formatting_integrity",
      message: "Leading or trailing whitespace in target",
    });
    scores.formatting_integrity = Math.min(
      scores.formatting_integrity ?? 100,
      80
    );
  }

  if (countNewlines(source) !== countNewlines(target) && target.trim()) {
    findings.push({
      code: "newline_structure_mismatch",
      severity: "warning",
      dimension: "formatting_integrity",
      message: "Newline count differs from source",
    });
    scores.formatting_integrity = Math.min(
      scores.formatting_integrity ?? 100,
      85
    );
  }

  if (/([!?.,])\1{2,}/.test(target) || /!!!/.test(target)) {
    findings.push({
      code: "punctuation_duplication",
      severity: "warning",
      dimension: "grammar_spelling",
      message: "Suspicious duplicated punctuation",
    });
    scores.grammar_spelling = Math.min(scores.grammar_spelling ?? 100, 75);
  }

  const guide = input.styleGuide;
  if (guide) {
    for (const pat of guide.forbiddenPatterns) {
      if (pat && target.includes(pat)) {
        findings.push({
          code: "casing_violation",
          severity: "warning",
          dimension: "locale_conventions",
          message: `Forbidden style pattern present: ${pat}`,
        });
        scores.locale_conventions = Math.min(
          scores.locale_conventions ?? 100,
          70
        );
      }
    }
  }

  // Terminology policy checks
  for (const term of input.glossaryTerms ?? []) {
    if (term.doNotTranslate) {
      const required =
        getApprovedTranslation(term, input.targetLocale) ?? term.sourceTerm;
      if (target.trim() && !target.includes(required)) {
        findings.push({
          code: "do_not_translate_altered",
          severity: "blocking",
          dimension: "terminology_compliance",
          message: `Do-not-translate term altered or missing: ${required}`,
        });
        scores.terminology_compliance = 0;
      }
    } else {
      const approved = getApprovedTranslation(term, input.targetLocale);
      if (approved && target.trim() && !includesLoose(target, approved)) {
        // Only flag if source term is present in source (applicable).
        findings.push({
          code: "required_terminology_missing",
          severity: "error",
          dimension: "terminology_compliance",
          message: `Approved terminology missing for "${term.sourceTerm}": expected "${approved}"`,
        });
        scores.terminology_compliance = Math.min(
          scores.terminology_compliance ?? 100,
          40
        );
      }
      const forbidden =
        term.forbiddenAlternatives[input.targetLocale] ?? [];
      for (const bad of forbidden) {
        if (bad && includesLoose(target, bad)) {
          findings.push({
            code: "forbidden_glossary_alternative",
            severity: "blocking",
            dimension: "terminology_compliance",
            message: `Forbidden alternative for "${term.sourceTerm}": ${bad}`,
          });
          scores.terminology_compliance = 0;
        }
      }
    }
  }

  const maxRatio = input.maxLengthRatio ?? 2.5;
  const maxAbs = input.maxAbsoluteLength ?? 120;
  if (source.trim() && target.trim()) {
    const ratio = target.length / Math.max(1, source.length);
    if (ratio > maxRatio || target.length > maxAbs && source.length <= 24) {
      findings.push({
        code: "ui_length_warning",
        severity: "warning",
        dimension: "ui_conciseness",
        message: `Target length may be too long for UI (ratio=${ratio.toFixed(2)}, len=${target.length})`,
      });
      scores.ui_conciseness = Math.min(scores.ui_conciseness ?? 100, 65);
    }
  }

  if (input.targetLocale === "ar") {
    const ar = runArabicDeterministicChecks({
      sourceText: source,
      targetText: target,
      glossaryTerms: input.glossaryTerms ?? [],
    });
    findings.push(...ar.findings);
    for (const [dim, score] of Object.entries(ar.scoreCaps)) {
      const key = dim as TranslationQualityDimension;
      scores[key] = Math.min(scores[key] ?? 100, score);
    }
  }

  // Deterministic engine does not fully judge semantic/fluency — leave high
  // unless already penalized; attach info for transparency.
  if (!findings.some((f) => f.dimension === "semantic_accuracy")) {
    findings.push({
      code: "reviewer_finding",
      severity: "info",
      dimension: "semantic_accuracy",
      message:
        "Semantic accuracy not fully judged by deterministic QA — use AI reviewer / human for professional sign-off",
    });
  }

  const dimensions = baseDimensions(scores);
  return {
    overall: computeOverallQualityScore(dimensions),
    dimensions,
    findings,
  };
}

function includesLoose(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.trim().toLowerCase());
}
