/**
 * Provider-neutral AI generator + reviewer contracts (foundation only).
 * No provider keys. Fail-closed parsers. No approve/publish authority.
 */

import type { StudioLanguageCode } from "../types";
import type { ProfessionalTranslationRequestContext } from "./contextBuilder";
import type {
  TranslationQualityDimension,
  TranslationQualityFinding,
} from "./types";

export type ProfessionalAiProviderMetadata = {
  providerId: string;
  modelId: string;
  /** Opaque request id — never a secret. */
  requestId?: string;
};

export type ProfessionalTranslationGeneratorInput = {
  context: ProfessionalTranslationRequestContext;
};

export type ProfessionalTranslationGeneratorOutput = {
  candidateText: string;
  rationaleNotes?: string;
  terminologyDecisions?: Array<{
    sourceTerm: string;
    chosenTranslation: string;
  }>;
  /** Model self-reported confidence 0–1 — NOT correctness. */
  confidence?: number;
  provider: ProfessionalAiProviderMetadata;
};

/**
 * Generator produces candidates only. Never approves or publishes.
 */
export type ProfessionalTranslationGenerator = {
  readonly kind: "professional_generator";
  generate(
    input: ProfessionalTranslationGeneratorInput
  ): Promise<ProfessionalTranslationGeneratorOutput>;
};

export type ProfessionalTranslationReviewInput = {
  sourceText: string;
  targetText: string;
  sourceLocale: StudioLanguageCode;
  targetLocale: StudioLanguageCode;
  context: ProfessionalTranslationRequestContext;
  deterministicFindings: TranslationQualityFinding[];
};

export type ProfessionalTranslationReviewResult = {
  dimensionScores: Partial<Record<TranslationQualityDimension, number>>;
  findings: TranslationQualityFinding[];
  suggestedRevision?: string;
  /** Model self-reported confidence 0–1 — NOT correctness. */
  confidence?: number;
  provider: ProfessionalAiProviderMetadata;
};

/**
 * Reviewer evaluates candidates. Never publishes or approves.
 * Must be logically separable from the generator (different instance/provider allowed).
 */
export type ProfessionalTranslationReviewer = {
  readonly kind: "professional_reviewer";
  review(
    input: ProfessionalTranslationReviewInput
  ): Promise<ProfessionalTranslationReviewResult>;
};

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v != null && !Array.isArray(v);
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
      providerId: raw.providerId,
      modelId: raw.modelId,
      requestId:
        typeof raw.requestId === "string" ? raw.requestId : undefined,
    },
  };
}

/** Fail-closed parser for generator output. */
export function parseProfessionalTranslationGeneratorOutput(
  raw: unknown
): ParseResult<ProfessionalTranslationGeneratorOutput> {
  if (!isPlainObject(raw)) return { ok: false, error: "object required" };
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
      candidateText: raw.candidateText,
      rationaleNotes:
        typeof raw.rationaleNotes === "string" ? raw.rationaleNotes : undefined,
      confidence:
        typeof raw.confidence === "number" ? raw.confidence : undefined,
      provider: provider.value,
    },
  };
}

/** Fail-closed parser for reviewer output. */
export function parseProfessionalTranslationReviewResult(
  raw: unknown
): ParseResult<ProfessionalTranslationReviewResult> {
  if (!isPlainObject(raw)) return { ok: false, error: "object required" };
  const provider = parseProvider(raw.provider);
  if (!provider.ok) return provider;
  if (raw.findings != null && !Array.isArray(raw.findings)) {
    return { ok: false, error: "findings must be an array when present" };
  }
  if (
    raw.confidence != null &&
    (typeof raw.confidence !== "number" ||
      raw.confidence < 0 ||
      raw.confidence > 1)
  ) {
    return { ok: false, error: "confidence must be 0–1 when present" };
  }
  const findings: TranslationQualityFinding[] = [];
  if (Array.isArray(raw.findings)) {
    for (const f of raw.findings) {
      if (!isPlainObject(f)) {
        return { ok: false, error: "invalid finding entry" };
      }
      if (typeof f.code !== "string" || typeof f.message !== "string") {
        return { ok: false, error: "finding.code/message required" };
      }
      findings.push({
        code: "reviewer_finding",
        severity:
          f.severity === "blocking" ||
          f.severity === "error" ||
          f.severity === "warning" ||
          f.severity === "info"
            ? f.severity
            : "warning",
        dimension: "semantic_accuracy",
        message: String(f.message).slice(0, 500),
      });
    }
  }
  const dimensionScores: Partial<Record<TranslationQualityDimension, number>> =
    {};
  if (isPlainObject(raw.dimensionScores)) {
    for (const [k, v] of Object.entries(raw.dimensionScores)) {
      if (typeof v === "number" && v >= 0 && v <= 100) {
        dimensionScores[k as TranslationQualityDimension] = v;
      }
    }
  }
  return {
    ok: true,
    value: {
      dimensionScores,
      findings,
      suggestedRevision:
        typeof raw.suggestedRevision === "string"
          ? raw.suggestedRevision
          : undefined,
      confidence:
        typeof raw.confidence === "number" ? raw.confidence : undefined,
      provider: provider.value,
    },
  };
}

/** Explicit authority denials — contracts cannot approve/publish. */
export const PROFESSIONAL_AI_AUTHORITY = {
  generatorCanApprove: false,
  generatorCanPublish: false,
  reviewerCanApprove: false,
  reviewerCanPublish: false,
} as const;

export function createFailClosedStubGenerator(): ProfessionalTranslationGenerator {
  return {
    kind: "professional_generator",
    async generate(input) {
      return {
        candidateText: `[stub:${input.context.targetLocale}] ${input.context.sourceText}`,
        confidence: 0.3,
        rationaleNotes: "Stub generator — not a live provider.",
        provider: { providerId: "stub", modelId: "stub-v1" },
      };
    },
  };
}

export function createFailClosedStubReviewer(): ProfessionalTranslationReviewer {
  return {
    kind: "professional_reviewer",
    async review() {
      return {
        dimensionScores: { semantic_accuracy: 70 },
        findings: [
          {
            code: "reviewer_finding",
            severity: "info",
            dimension: "semantic_accuracy",
            message: "Stub reviewer — not a live provider.",
          },
        ],
        confidence: 0.3,
        provider: { providerId: "stub", modelId: "stub-reviewer-v1" },
      };
    },
  };
}
