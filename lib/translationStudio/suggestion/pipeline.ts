/**
 * Suggestion pipeline (foundation):
 * source → (memory reuse | AI port) → candidate + quality → pending_review
 * Human approval → Translation Memory (never auto-publish).
 */

import type { TranslationAiPort } from "../ai/translationAiPort";
import type { TerminologyStore } from "../terminology";
import type { TranslationMemoryStore } from "../translationMemory";
import { assertTransitionTranslationStatus } from "../status";
import type {
  StudioLanguageCode,
  StudioTranslationValue,
  TranslationSuggestion,
} from "../types";

export type SuggestionPipeline = {
  propose(input: {
    sourceText: string;
    targetLanguage: StudioLanguageCode;
    keyId?: string | null;
    sourceLanguage?: StudioLanguageCode;
    namespaceHint?: string;
  }): Promise<TranslationSuggestion>;
  /**
   * Human approval only — writes Translation Memory and optional value update.
   * Does not publish to product i18n catalogs automatically.
   */
  approve(input: {
    suggestion: TranslationSuggestion;
    value?: StudioTranslationValue | null;
  }): {
    memoryId: string;
    value: StudioTranslationValue | null;
  };
};

export function createSuggestionPipeline(deps: {
  memory: TranslationMemoryStore;
  terminology: TerminologyStore;
  ai: TranslationAiPort;
}): SuggestionPipeline {
  let seq = 0;

  return {
    async propose(input) {
      const terms = deps.terminology.findInSourceText(input.sourceText);
      const terminologyHints = terms
        .map((t) => {
          const translation = t.translations[input.targetLanguage];
          if (!translation) return null;
          return { term: t.term, translation };
        })
        .filter((x): x is { term: string; translation: string } => x != null);

      const memoryHit = deps.memory.lookup({
        sourceText: input.sourceText,
        language: input.targetLanguage,
      });

      let candidateText: string;
      let confidence: number;
      let providerVia: TranslationSuggestion["quality"]["providerVia"];
      let reusedFromMemory = false;
      let notes: string | undefined;

      if (memoryHit) {
        candidateText = memoryHit.translatedText;
        confidence = 0.98;
        providerVia = "memory";
        reusedFromMemory = true;
        notes = "Reused approved Translation Memory entry.";
      } else {
        const aiResult = await deps.ai.suggest({
          sourceText: input.sourceText,
          targetLanguage: input.targetLanguage,
          sourceLanguage: input.sourceLanguage ?? "en",
          namespaceHint: input.namespaceHint,
          terminologyHints,
        });
        candidateText = aiResult.candidateText;
        confidence = aiResult.confidence;
        providerVia = deps.ai.kind;
        notes = aiResult.notes;
      }

      seq += 1;
      return {
        id: `sug_${seq}`,
        keyId: input.keyId ?? null,
        sourceText: input.sourceText,
        targetLanguage: input.targetLanguage,
        candidateText,
        quality: {
          confidence,
          reusedFromMemory,
          terminologyHits: terminologyHints.map((h) => h.term),
          providerVia,
          notes,
        },
        status: "pending_review",
        createdAt: new Date().toISOString(),
      };
    },

    approve({ suggestion, value = null }) {
      const remembered = deps.memory.rememberApproved({
        sourceText: suggestion.sourceText,
        language: suggestion.targetLanguage,
        translatedText: suggestion.candidateText,
      });

      if (!value) {
        return { memoryId: remembered.id, value: null };
      }

      assertTransitionTranslationStatus(value.status, "approved");
      const next: StudioTranslationValue = {
        ...value,
        value: suggestion.candidateText,
        status: "approved",
        suggestionId: suggestion.id,
        updatedAt: new Date().toISOString(),
      };
      return { memoryId: remembered.id, value: next };
    },
  };
}
