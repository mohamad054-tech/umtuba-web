/**
 * AI Translation port — Studio never imports providers/adapters.
 * Live path must go through aiService.runCapability (Provider Foundation).
 */

import type { StudioLanguageCode } from "../types";

export type TranslationAiSuggestInput = {
  sourceText: string;
  targetLanguage: StudioLanguageCode;
  sourceLanguage?: StudioLanguageCode;
  namespaceHint?: string;
  terminologyHints?: Array<{ term: string; translation: string }>;
};

export type TranslationAiSuggestOutput = {
  candidateText: string;
  confidence: number;
  notes?: string;
};

export type TranslationAiPort = {
  readonly kind: "ai_service" | "stub";
  suggest(
    input: TranslationAiSuggestInput
  ): Promise<TranslationAiSuggestOutput>;
};

export function createStubTranslationAiPort(): TranslationAiPort {
  return {
    kind: "stub",
    async suggest(input) {
      const hint =
        input.terminologyHints?.[0]?.translation ??
        `[${input.targetLanguage}] ${input.sourceText}`;
      return {
        candidateText: hint,
        confidence: 0.42,
        notes: "Stub AI port — not a live provider call.",
      };
    },
  };
}

/**
 * Adapter over Shared AI Core public entry (`aiService.runCapability`).
 * Capability id is stable; providers are selected only inside the gateway.
 */
export type AiServiceRunner = (request: {
  capabilityId: string;
  input: { text?: string; notes?: string };
  context: {
    surface: string;
    productDomain: string;
    locale?: string;
  };
}) => Promise<
  | {
      ok: true;
      data: {
        result: Record<string, unknown>;
      };
    }
  | { ok: false; error: { message: string } }
>;

export function createAiServiceTranslationPort(
  runCapability: AiServiceRunner
): TranslationAiPort {
  return {
    kind: "ai_service",
    async suggest(input) {
      const terminologyBlock =
        input.terminologyHints
          ?.map((h) => `${h.term}=${h.translation}`)
          .join("; ") ?? "";
      const result = await runCapability({
        capabilityId: "platform.translation_suggest",
        input: {
          text: input.sourceText,
          notes: [
            `targetLanguage=${input.targetLanguage}`,
            input.sourceLanguage
              ? `sourceLanguage=${input.sourceLanguage}`
              : null,
            terminologyBlock ? `terminology=${terminologyBlock}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        },
        context: {
          productDomain: "platform",
          surface: "admin.translation_studio",
          locale: input.targetLanguage,
        },
      });

      if (!result.ok) {
        throw new Error(result.error.message || "Translation AI failed.");
      }

      const payload = result.data.result;
      const candidateText =
        typeof payload.candidateText === "string"
          ? payload.candidateText
          : typeof payload.content === "string"
            ? payload.content
            : "";
      if (!candidateText.trim()) {
        throw new Error("Translation AI returned empty candidate.");
      }
      const confidence =
        typeof payload.confidence === "number" ? payload.confidence : 0.5;

      return {
        candidateText: candidateText.trim(),
        confidence,
        notes:
          typeof payload.notes === "string" ? payload.notes : undefined,
      };
    },
  };
}
