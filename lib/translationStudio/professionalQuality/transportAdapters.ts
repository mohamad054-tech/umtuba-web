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
  readonly detail?: Record<string, string | number | boolean | null>;
  constructor(
    code: string,
    message: string,
    detail?: Record<string, string | number | boolean | null>
  ) {
    super(message);
    this.name = "ProfessionalAiTransportError";
    this.failureCode = code;
    this.detail = detail;
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
          result.failure.message,
          {
            attempts: result.attempts,
            responsePresent: false,
            jsonParseSucceeded: false,
            ...(result.failure.detail ?? {}),
          }
        );
      }
      const parsed = parseStrictProfessionalReviewResult(result.json);
      if (!parsed.ok) {
        throw new ProfessionalAiTransportError(
          "schema_mismatch",
          parsed.error,
          {
            attempts: result.attempts,
            responsePresent: true,
            jsonParseSucceeded: true,
            validationIssue: parsed.error.slice(0, 160),
          }
        );
      }
      // Prefer transport/routing attribution over model-claimed provider labels.
      return {
        ...parsed.value,
        provider: {
          providerId: result.provider.providerId,
          modelId: result.provider.modelId,
          requestId: result.provider.requestId,
        },
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
          result.failure.message,
          {
            attempts: result.attempts,
            responsePresent: false,
            jsonParseSucceeded: false,
            ...(result.failure.detail ?? {}),
          }
        );
      }
      const parsed = parseStrictProfessionalGeneratorOutput(result.json);
      if (!parsed.ok) {
        throw new ProfessionalAiTransportError(
          "schema_mismatch",
          parsed.error,
          {
            attempts: result.attempts,
            responsePresent: true,
            jsonParseSucceeded: true,
            validationIssue: parsed.error.slice(0, 160),
          }
        );
      }
      return {
        ...parsed.value,
        provider: {
          providerId: result.provider.providerId,
          modelId: result.provider.modelId,
          requestId: result.provider.requestId,
        },
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
    return reviewFailure(code, err.message.slice(0, 200), err.detail);
  }
  const message = err instanceof Error ? err.message : "review_unavailable";
  return reviewFailure("review_unavailable", message.slice(0, 200));
}
