import { sourceFingerprint } from "./normalize";
import type {
  StudioLanguageCode,
  TranslationMemoryEntry,
} from "./types";

export type TranslationMemoryStore = {
  list(): TranslationMemoryEntry[];
  lookup(input: {
    sourceText: string;
    language: StudioLanguageCode;
  }): TranslationMemoryEntry | null;
  findDuplicates(sourceText: string): TranslationMemoryEntry[];
  /**
   * Persist an approved translation. Duplicate fingerprint+language updates
   * in place (reuse), never creates conflicting approved rows.
   */
  rememberApproved(input: {
    sourceText: string;
    language: StudioLanguageCode;
    translatedText: string;
    namespaceId?: string | null;
    now?: string;
  }): TranslationMemoryEntry;
};

export function createTranslationMemory(
  initial: TranslationMemoryEntry[] = []
): TranslationMemoryStore {
  const entries = [...initial];
  let seq = entries.length;

  function nextId(): string {
    seq += 1;
    return `tm_${seq}`;
  }

  return {
    list() {
      return [...entries];
    },

    lookup({ sourceText, language }) {
      const fp = sourceFingerprint(sourceText);
      return (
        entries.find(
          (e) =>
            e.sourceFingerprint === fp &&
            e.language === language &&
            e.status === "approved"
        ) ?? null
      );
    },

    findDuplicates(sourceText) {
      const fp = sourceFingerprint(sourceText);
      return entries.filter((e) => e.sourceFingerprint === fp);
    },

    rememberApproved({
      sourceText,
      language,
      translatedText,
      namespaceId = null,
      now = new Date().toISOString(),
    }) {
      const fp = sourceFingerprint(sourceText);
      const existing = entries.find(
        (e) => e.sourceFingerprint === fp && e.language === language
      );
      if (existing) {
        existing.sourceText = sourceText.trim();
        existing.translatedText = translatedText.trim();
        existing.namespaceId = namespaceId;
        existing.createdAt = now;
        existing.status = "approved";
        return { ...existing };
      }
      const created: TranslationMemoryEntry = {
        id: nextId(),
        sourceFingerprint: fp,
        sourceText: sourceText.trim(),
        language,
        translatedText: translatedText.trim(),
        status: "approved",
        namespaceId,
        createdAt: now,
      };
      entries.push(created);
      return { ...created };
    },
  };
}
