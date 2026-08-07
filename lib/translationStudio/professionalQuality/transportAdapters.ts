/**
 * Adapter: ProfessionalAiTransport → ProfessionalTranslationReviewer / Generator.
 */

import type {
  ProfessionalTranslationGenerator,
  ProfessionalTranslationGeneratorOutput,
  ProfessionalTranslationReviewer,
  ProfessionalTranslationReviewResult,
} from "./aiContracts";
import {
  parseStrictProfessionalGeneratorOutput,
  parseStrictProfessionalReviewResult,
} from "./reviewSchema";
import {
  buildProfessionalGeneratorPromptPayload,
  buildProfessionalReviewerPromptPayload,
} from "./reviewerPrompt";
import type { ProfessionalAiTransport } from "./providerTransport";
import { reviewFailure } from "./reviewFailures";

export class ProfessionalAiTransportError extends Error {
  readonly failureCode: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "ProfessionalAiTransportError";
    this.failureCode = code;
  }
}

export function createTransportBackedProfessionalReviewer(
  transport: ProfessionalAiTransport
): ProfessionalTranslationReviewer {
  return {
    kind: "professional_reviewer",
    async review(input): Promise<ProfessionalTranslationReviewResult> {
      const prompt = buildProfessionalReviewerPromptPayload({
        context: input.context,
        targetText: input.targetText,
        deterministicFindings: input.deterministicFindings,
      });
      const result = await transport.completeJson({
        role: "reviewer",
        systemPrompt: prompt.system,
        userPayload: prompt.user,
      });
      if (!result.ok) {
        throw new ProfessionalAiTransportError(
          result.failure.code,
          result.failure.message
        );
      }
      const parsed = parseStrictProfessionalReviewResult(result.json);
      if (!parsed.ok) {
        throw new ProfessionalAiTransportError(
          "schema_mismatch",
          parsed.error
        );
      }
      return {
        ...parsed.value,
        provider: parsed.value.provider ?? result.provider,
      };
    },
  };
}

export function createTransportBackedProfessionalGenerator(
  transport: ProfessionalAiTransport
): ProfessionalTranslationGenerator {
  return {
    kind: "professional_generator",
    async generate(input): Promise<ProfessionalTranslationGeneratorOutput> {
      const prompt = buildProfessionalGeneratorPromptPayload({
        context: input.context,
      });
      const result = await transport.completeJson({
        role: "generator",
        systemPrompt: prompt.system,
        userPayload: prompt.user,
      });
      if (!result.ok) {
        throw new ProfessionalAiTransportError(
          result.failure.code,
          result.failure.message
        );
      }
      const parsed = parseStrictProfessionalGeneratorOutput(result.json);
      if (!parsed.ok) {
        throw new ProfessionalAiTransportError(
          "schema_mismatch",
          parsed.error
        );
      }
      return {
        ...parsed.value,
        provider: parsed.value.provider ?? result.provider,
      };
    },
  };
}

export function mapTransportErrorToFailure(err: unknown) {
  if (err instanceof ProfessionalAiTransportError) {
    const code =
      err.failureCode === "provider_timeout" ||
      err.failureCode === "transport_error" ||
      err.failureCode === "invalid_json" ||
      err.failureCode === "schema_mismatch" ||
      err.failureCode === "provider_unavailable" ||
      err.failureCode === "content_rejected"
        ? err.failureCode
        : "review_unavailable";
    return reviewFailure(code, err.message);
  }
  const message = err instanceof Error ? err.message : "review_unavailable";
  return reviewFailure("review_unavailable", message.slice(0, 200));
}
