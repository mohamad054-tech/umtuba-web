/**
 * Strict reviewer/generator result schema validation (fail-closed).
 * Rejects authority fields, invalid dimensions/scores, unbounded payloads, CoT.
 */

import {
  TRANSLATION_QUALITY_DIMENSIONS,
  type TranslationQualityDimension,
  type TranslationQualityFinding,
  type TranslationQualitySeverity,
} from "./types";
import type {
  ParseResult,
  ProfessionalAiProviderMetadata,
  ProfessionalTranslationGeneratorOutput,
  ProfessionalTranslationReviewResult,
} from "./aiContracts";

const ALLOWED_SEVERITIES: TranslationQualitySeverity[] = [
  "info",
  "warning",
  "error",
  "blocking",
];

const FORBIDDEN_AUTHORITY_KEYS = [
  "approve",
  "approved",
  "publish",
  "published",
  "canApprove",
  "canPublish",
  "authority",
  "autoApprove",
  "autoPublish",
];

const FORBIDDEN_COT_KEYS = [
  "chainOfThought",
  "chain_of_thought",
  "reasoning",
  "hiddenReasoning",
  "rawThoughts",
  "scratchpad",
];

const MAX_FINDINGS = 40;
const MAX_MESSAGE_LEN = 500;
const MAX_REVISION_LEN = 4000;
const MAX_RATIONALE_LEN = 1000;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v != null && !Array.isArray(v);
}

function rejectForbiddenKeys(
  raw: Record<string, unknown>
): ParseResult<never> | null {
  for (const key of Object.keys(raw)) {
    const lower = key.toLowerCase();
    if (
      FORBIDDEN_AUTHORITY_KEYS.some((k) => k.toLowerCase() === lower) ||
      FORBIDDEN_COT_KEYS.some((k) => k.toLowerCase() === lower)
    ) {
      return {
        ok: false,
        error: `forbidden field rejected: ${key}`,
      };
    }
  }
  return null;
}

function parseProvider(
  raw: unknown
): ParseResult<ProfessionalAiProviderMetadata> {
  if (!isPlainObject(raw)) return { ok: false, error: "provider object required" };
  if (typeof raw.providerId !== "string" || !raw.providerId.trim()) {
    return { ok: false, error: "provider.providerId required" };
  }
  if (typeof raw.modelId !== "string" || !raw.modelId.trim()) {
    return { ok: false, error: "provider.modelId required" };
  }
  return {
    ok: true,
    value: {
      providerId: raw.providerId.slice(0, 120),
      modelId: raw.modelId.slice(0, 120),
      requestId:
        typeof raw.requestId === "string"
          ? raw.requestId.slice(0, 120)
          : undefined,
    },
  };
}

function isAllowedDimension(k: string): k is TranslationQualityDimension {
  return (TRANSLATION_QUALITY_DIMENSIONS as readonly string[]).includes(k);
}

function parseDimensionScores(
  raw: unknown
): ParseResult<Partial<Record<TranslationQualityDimension, number>>> {
  if (raw == null) return { ok: true, value: {} };
  if (!isPlainObject(raw)) {
    return { ok: false, error: "dimensionScores must be an object" };
  }
  const out: Partial<Record<TranslationQualityDimension, number>> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!isAllowedDimension(k)) {
      return { ok: false, error: `unknown dimension: ${k}` };
    }
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 100) {
      return { ok: false, error: `invalid score for ${k}` };
    }
    out[k] = Math.round(v);
  }
  return { ok: true, value: out };
}

function parseFindings(raw: unknown): ParseResult<TranslationQualityFinding[]> {
  if (raw == null) return { ok: true, value: [] };
  if (!Array.isArray(raw)) {
    return { ok: false, error: "findings must be an array" };
  }
  if (raw.length > MAX_FINDINGS) {
    return { ok: false, error: `findings exceed max ${MAX_FINDINGS}` };
  }
  const findings: TranslationQualityFinding[] = [];
  for (const f of raw) {
    if (!isPlainObject(f)) {
      return { ok: false, error: "invalid finding entry" };
    }
    if (typeof f.message !== "string" || !f.message.trim()) {
      return { ok: false, error: "finding.message required" };
    }
    const severity = ALLOWED_SEVERITIES.includes(
      f.severity as TranslationQualitySeverity
    )
      ? (f.severity as TranslationQualitySeverity)
      : null;
    if (!severity) {
      return { ok: false, error: "finding.severity invalid" };
    }
    let dimension: TranslationQualityDimension | "overall" = "semantic_accuracy";
    if (typeof f.dimension === "string") {
      if (f.dimension === "overall" || isAllowedDimension(f.dimension)) {
        dimension = f.dimension;
      } else {
        return { ok: false, error: `finding.dimension invalid: ${f.dimension}` };
      }
    }
    findings.push({
      code: "reviewer_finding",
      severity,
      dimension,
      message: f.message.slice(0, MAX_MESSAGE_LEN),
    });
  }
  return { ok: true, value: findings };
}

export type StrictProfessionalReviewResult = ProfessionalTranslationReviewResult & {
  schemaVersion: 1;
  terminologyDecisions?: Array<{
    sourceTerm: string;
    chosenTranslation: string;
  }>;
};

/**
 * Strict fail-closed parser for professional reviewer JSON.
 */
export function parseStrictProfessionalReviewResult(
  raw: unknown
): ParseResult<StrictProfessionalReviewResult> {
  if (!isPlainObject(raw)) return { ok: false, error: "object required" };
  const forbidden = rejectForbiddenKeys(raw);
  if (forbidden) return forbidden;

  if (raw.schemaVersion != null && raw.schemaVersion !== 1) {
    return { ok: false, error: "schemaVersion must be 1" };
  }

  const provider = parseProvider(raw.provider);
  if (!provider.ok) return provider;

  const dim = parseDimensionScores(raw.dimensionScores);
  if (!dim.ok) return dim;

  const findings = parseFindings(raw.findings);
  if (!findings.ok) return findings;

  if (
    raw.confidence != null &&
    (typeof raw.confidence !== "number" ||
      raw.confidence < 0 ||
      raw.confidence > 1)
  ) {
    return { ok: false, error: "confidence must be 0–1 when present" };
  }

  let suggestedRevision: string | undefined;
  if (raw.suggestedRevision != null) {
    if (typeof raw.suggestedRevision !== "string") {
      return { ok: false, error: "suggestedRevision must be string" };
    }
    suggestedRevision = raw.suggestedRevision.slice(0, MAX_REVISION_LEN);
  }

  const terminologyDecisions: StrictProfessionalReviewResult["terminologyDecisions"] =
    [];
  if (raw.terminologyDecisions != null) {
    if (!Array.isArray(raw.terminologyDecisions)) {
      return { ok: false, error: "terminologyDecisions must be array" };
    }
    for (const t of raw.terminologyDecisions.slice(0, 40)) {
      if (!isPlainObject(t)) continue;
      if (
        typeof t.sourceTerm === "string" &&
        typeof t.chosenTranslation === "string"
      ) {
        terminologyDecisions.push({
          sourceTerm: t.sourceTerm.slice(0, 120),
          chosenTranslation: t.chosenTranslation.slice(0, 200),
        });
      }
    }
  }

  return {
    ok: true,
    value: {
      schemaVersion: 1,
      dimensionScores: dim.value,
      findings: findings.value,
      suggestedRevision,
      terminologyDecisions:
        terminologyDecisions.length > 0 ? terminologyDecisions : undefined,
      confidence:
        typeof raw.confidence === "number" ? raw.confidence : undefined,
      provider: provider.value,
    },
  };
}

/**
 * Strict fail-closed parser for generator output (no approve/publish).
 */
export function parseStrictProfessionalGeneratorOutput(
  raw: unknown
): ParseResult<ProfessionalTranslationGeneratorOutput> {
  if (!isPlainObject(raw)) return { ok: false, error: "object required" };
  const forbidden = rejectForbiddenKeys(raw);
  if (forbidden) return forbidden;
  if (typeof raw.candidateText !== "string" || !raw.candidateText.trim()) {
    return { ok: false, error: "candidateText required" };
  }
  const provider = parseProvider(raw.provider);
  if (!provider.ok) return provider;
  if (
    raw.confidence != null &&
    (typeof raw.confidence !== "number" ||
      raw.confidence < 0 ||
      raw.confidence > 1)
  ) {
    return { ok: false, error: "confidence must be 0–1 when present" };
  }
  return {
    ok: true,
    value: {
      candidateText: raw.candidateText.slice(0, MAX_REVISION_LEN),
      rationaleNotes:
        typeof raw.rationaleNotes === "string"
          ? raw.rationaleNotes.slice(0, MAX_RATIONALE_LEN)
          : undefined,
      confidence:
        typeof raw.confidence === "number" ? raw.confidence : undefined,
      provider: provider.value,
    },
  };
}
