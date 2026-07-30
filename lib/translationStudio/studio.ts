import { MESSAGE_CATALOGS } from "../i18n/messages/catalogs";
import { enMessages } from "../i18n/messages/en";
import type { TranslationKey } from "../i18n/messages/types";
import { createStubTranslationAiPort } from "./ai/translationAiPort";
import { listStudioLanguages } from "./languages";
import { createSuggestionPipeline } from "./suggestion/pipeline";
import {
  createTerminologyStore,
  seedUmtubaTerminology,
} from "./terminology";
import { createTranslationMemory } from "./translationMemory";
import type {
  StudioNamespace,
  StudioSnapshot,
  StudioTranslationKey,
  StudioTranslationValue,
  TranslationSuggestion,
} from "./types";

function namespaceForKey(key: string): string {
  return key.split(".")[0] ?? "app";
}

export type TranslationStudio = {
  getSnapshot(): StudioSnapshot;
  getLanguage(code: string): StudioSnapshot["languages"][number] | null;
  getNamespace(id: string): StudioNamespace | null;
  getKey(id: string): StudioTranslationKey | null;
  listKeys(namespaceId?: string): StudioTranslationKey[];
  listValuesForKey(keyId: string): StudioTranslationValue[];
  listTerminology(): StudioSnapshot["terminology"];
  listSuggestions(): TranslationSuggestion[];
  proposeSuggestion(input: {
    keyId: string;
    language: StudioSnapshot["languages"][number]["code"];
  }): Promise<TranslationSuggestion>;
  memory: ReturnType<typeof createTranslationMemory>;
  terminology: ReturnType<typeof createTerminologyStore>;
};

/**
 * In-memory studio seeded from App Shell i18n catalogs + terminology.
 * Read-only product UI; pipeline APIs support foundation tests.
 */
export function createTranslationStudio(): TranslationStudio {
  const languages = listStudioLanguages();
  const namespaceNames = new Set<string>();
  for (const key of Object.keys(enMessages) as TranslationKey[]) {
    namespaceNames.add(namespaceForKey(key));
  }

  const namespaces: StudioNamespace[] = [...namespaceNames]
    .sort()
    .map((name) => ({
      id: `ns_${name}`,
      name,
      description: `Foundation namespace for ${name}.* keys`,
    }));

  const keys: StudioTranslationKey[] = [];
  const values: StudioTranslationValue[] = [];
  let keySeq = 0;
  let valueSeq = 0;

  for (const key of Object.keys(enMessages) as TranslationKey[]) {
    keySeq += 1;
    const ns = namespaceForKey(key);
    const keyId = `key_${keySeq}`;
    const sourceText = enMessages[key];
    keys.push({
      id: keyId,
      namespaceId: `ns_${ns}`,
      key,
      sourceText,
      description: `Seeded from lib/i18n catalog key ${key}`,
    });

    for (const lang of languages) {
      valueSeq += 1;
      const raw = MESSAGE_CATALOGS[lang.code][key] ?? "";
      let status: StudioTranslationValue["status"] = "approved";
      if (!raw) {
        status = "missing";
      } else if (lang.code === "en" || lang.code === "ar") {
        status = "approved";
      } else if (raw === enMessages[key] && key.startsWith("nav.")) {
        status = "needs_review";
      }

      values.push({
        id: `val_${valueSeq}`,
        keyId,
        language: lang.code,
        value: raw,
        status,
        updatedAt: new Date(0).toISOString(),
        suggestionId: null,
      });
    }
  }

  const memory = createTranslationMemory();
  for (const value of values) {
    if (value.status !== "approved" || value.language === "en") continue;
    const key = keys.find((k) => k.id === value.keyId);
    if (!key || !value.value) continue;
    memory.rememberApproved({
      sourceText: key.sourceText,
      language: value.language,
      translatedText: value.value,
      namespaceId: key.namespaceId,
      now: value.updatedAt,
    });
  }

  const terminology = createTerminologyStore(seedUmtubaTerminology());
  const pipeline = createSuggestionPipeline({
    memory,
    terminology,
    ai: createStubTranslationAiPort(),
  });
  const suggestions: TranslationSuggestion[] = [];

  return {
    memory,
    terminology,
    getSnapshot() {
      return {
        languages,
        namespaces,
        keys,
        values,
        memory: memory.list(),
        terminology: terminology.list(),
        suggestions: [...suggestions],
      };
    },
    getLanguage(code) {
      return languages.find((l) => l.code === code) ?? null;
    },
    getNamespace(id) {
      return namespaces.find((n) => n.id === id) ?? null;
    },
    getKey(id) {
      return keys.find((k) => k.id === id) ?? null;
    },
    listKeys(namespaceId) {
      return namespaceId
        ? keys.filter((k) => k.namespaceId === namespaceId)
        : [...keys];
    },
    listValuesForKey(keyId) {
      return values.filter((v) => v.keyId === keyId);
    },
    listTerminology() {
      return terminology.list();
    },
    listSuggestions() {
      return [...suggestions];
    },
    async proposeSuggestion({ keyId, language }) {
      const key = keys.find((k) => k.id === keyId);
      if (!key) throw new Error("Unknown translation key.");
      const suggestion = await pipeline.propose({
        sourceText: key.sourceText,
        targetLanguage: language,
        keyId,
        sourceLanguage: "en",
        namespaceHint: key.namespaceId,
      });
      suggestions.unshift(suggestion);
      return suggestion;
    },
  };
}

let singleton: TranslationStudio | null = null;

export function getTranslationStudio(): TranslationStudio {
  if (!singleton) singleton = createTranslationStudio();
  return singleton;
}
