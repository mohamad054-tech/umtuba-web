import type { StudioLanguageCode } from "../types";
import type {
  IntelligenceContentType,
  QualityDimensionScore,
  QualityScoreReport,
} from "./types";

const PLACEHOLDER_RE = /\{[^}]+\}|%\d+\$[sd]|:\w+/g;
const LATIN_WORD_RE = /[A-Za-z]{3,}/g;
const ARABIC_RE = /[\u0600-\u06FF]/;

export type QualityScoreInput = {
  sourceText: string;
  targetText: string;
  sourceLocale: StudioLanguageCode;
  targetLocale: StudioLanguageCode;
  contentType: IntelligenceContentType;
  expectedTerminology?: Array<{ term: string; expected: string }>;
  subtitleDurationMs?: number | null;
  targetCharBudget?: number | null;
  dubbingDurationMs?: number | null;
  estimatedSpeechMs?: number | null;
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function placeholders(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER_RE)].map((m) => m[0]!).sort();
}

/**
 * Deterministic, explainable quality scoring.
 * Does not claim perfect semantic accuracy. Blockers are authoritative.
 */
export function scoreTranslationQuality(
  input: QualityScoreInput
): QualityScoreReport {
  const dimensions: QualityDimensionScore[] = [];
  const warnings: string[] = [];
  const blockingFindings: string[] = [];

  const srcPh = placeholders(input.sourceText);
  const tgtPh = placeholders(input.targetText);
  const missingPh = srcPh.filter((p) => !tgtPh.includes(p));
  const extraPh = tgtPh.filter((p) => !srcPh.includes(p));
  const placeholderOk = missingPh.length === 0 && extraPh.length === 0;
  dimensions.push({
    id: "placeholder_preservation",
    score: placeholderOk ? 1 : 0,
    weight: 1.2,
    warning: placeholderOk
      ? null
      : `Placeholder mismatch (missing=${missingPh.join(",") || "—"}, extra=${extraPh.join(",") || "—"})`,
    blocking: !placeholderOk,
    detail: "Source placeholders must appear unchanged in the target.",
  });
  if (!placeholderOk) {
    blockingFindings.push("placeholder_preservation");
    warnings.push(dimensions.at(-1)!.warning!);
  }

  let leakageScore = 1;
  let leakageWarning: string | null = null;
  let leakageBlocking = false;
  if (input.targetLocale === "ar") {
    const hasArabic = ARABIC_RE.test(input.targetText);
    const latin = input.targetText.match(LATIN_WORD_RE) ?? [];
    const sourceLatinLeak =
      input.targetText.trim() === input.sourceText.trim() ||
      (!hasArabic && latin.length > 0);
    if (sourceLatinLeak) {
      leakageScore = 0;
      leakageBlocking = true;
      leakageWarning = "English/Latin leakage in Arabic target.";
    } else if (latin.length >= 3) {
      leakageScore = 0.5;
      leakageWarning = "Multiple Latin tokens in Arabic target.";
    }
  }
  dimensions.push({
    id: "language_leakage",
    score: leakageScore,
    weight: 1.1,
    warning: leakageWarning,
    blocking: leakageBlocking,
    detail: "Detect untranslated source leakage into the target locale.",
  });
  if (leakageWarning) warnings.push(leakageWarning);
  if (leakageBlocking) blockingFindings.push("language_leakage");

  const terms = input.expectedTerminology ?? [];
  let termHits = 0;
  let termMisses = 0;
  for (const t of terms) {
    if (input.sourceText.toLowerCase().includes(t.term.toLowerCase())) {
      if (input.targetText.includes(t.expected)) termHits += 1;
      else termMisses += 1;
    }
  }
  const termScore =
    terms.length === 0
      ? 0.85
      : termMisses === 0
        ? 1
        : clamp01(termHits / (termHits + termMisses));
  dimensions.push({
    id: "terminology_consistency",
    score: termScore,
    weight: 1,
    warning:
      termMisses > 0
        ? `${termMisses} terminology expectation(s) missing`
        : null,
    blocking: false,
    detail: "Approved terminology strings should appear when source terms do.",
  });
  if (termMisses > 0) warnings.push(dimensions.at(-1)!.warning!);

  const lengthRatio =
    input.sourceText.trim().length === 0
      ? 1
      : input.targetText.trim().length / input.sourceText.trim().length;
  const coverageScore = clamp01(
    lengthRatio < 0.25 ? lengthRatio * 2 : lengthRatio > 3 ? 0.4 : 0.9
  );
  dimensions.push({
    id: "source_meaning_coverage",
    score: coverageScore,
    weight: 0.8,
    warning:
      coverageScore < 0.5
        ? "Target length is unusually short/long vs source (heuristic)."
        : null,
    blocking: false,
    detail:
      "Heuristic length coverage only — not a claim of semantic accuracy.",
  });
  if (coverageScore < 0.5) warnings.push(dimensions.at(-1)!.warning!);

  const fluencyScore = input.targetText.trim().length > 0 ? 0.8 : 0;
  dimensions.push({
    id: "target_fluency",
    score: fluencyScore,
    weight: 0.7,
    warning: fluencyScore === 0 ? "Empty target text." : null,
    blocking: fluencyScore === 0,
    detail: "Lightweight non-empty fluency proxy for V1.",
  });
  if (fluencyScore === 0) {
    blockingFindings.push("target_fluency");
    warnings.push("Empty target text.");
  }

  const formattingScore =
    (input.sourceText.includes("\n") === input.targetText.includes("\n")
      ? 0.5
      : 0) +
    (/\s{2,}/.test(input.sourceText) === /\s{2,}/.test(input.targetText)
      ? 0.5
      : 0.25);
  dimensions.push({
    id: "formatting_preservation",
    score: clamp01(formattingScore),
    weight: 0.5,
    warning: null,
    blocking: false,
    detail: "Basic newline / spacing preservation heuristic.",
  });

  const punctScore =
    /[.!?…]$/.test(input.sourceText.trim()) ===
    /[.!?…؟]$/.test(input.targetText.trim())
      ? 0.9
      : 0.6;
  dimensions.push({
    id: "punctuation_capitalization",
    score: punctScore,
    weight: 0.4,
    warning: null,
    blocking: false,
    detail: "End punctuation consistency heuristic.",
  });

  if (
    input.contentType === "subtitle_segment" &&
    input.subtitleDurationMs != null &&
    input.targetCharBudget != null
  ) {
    const over = input.targetText.length > input.targetCharBudget;
    dimensions.push({
      id: "subtitle_timing_fitness",
      score: over ? 0.3 : 0.9,
      weight: 0.9,
      warning: over ? "Subtitle text exceeds char budget for timing." : null,
      blocking: false,
      detail: "Character budget vs duration fitness (contract only).",
    });
    if (over) warnings.push(dimensions.at(-1)!.warning!);
  } else {
    dimensions.push({
      id: "subtitle_timing_fitness",
      score: 1,
      weight: 0,
      warning: null,
      blocking: false,
      detail: "Not applicable.",
    });
  }

  if (
    input.contentType === "dubbing_segment" &&
    input.dubbingDurationMs != null &&
    input.estimatedSpeechMs != null
  ) {
    const delta = Math.abs(input.dubbingDurationMs - input.estimatedSpeechMs);
    const ok = delta <= input.dubbingDurationMs * 0.25;
    dimensions.push({
      id: "dubbing_duration_fitness",
      score: ok ? 0.9 : 0.4,
      weight: 0.9,
      warning: ok ? null : "Estimated speech duration diverges from target.",
      blocking: false,
      detail: "Duration fitness contract — no TTS in this milestone.",
    });
    if (!ok) warnings.push(dimensions.at(-1)!.warning!);
  } else {
    dimensions.push({
      id: "dubbing_duration_fitness",
      score: 1,
      weight: 0,
      warning: null,
      blocking: false,
      detail: "Not applicable.",
    });
  }

  const weightSum = dimensions.reduce((s, d) => s + d.weight, 0) || 1;
  const overallScore = clamp01(
    dimensions.reduce((s, d) => s + d.score * d.weight, 0) / weightSum
  );

  return {
    overallScore,
    dimensions,
    warnings,
    blockingFindings,
    scoringMode: "deterministic_v1",
    notes:
      "Deterministic V1 scoring. Not a claim of perfect semantic accuracy.",
  };
}
